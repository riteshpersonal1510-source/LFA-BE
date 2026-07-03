"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleMapsScraper = void 0;
const browser_manager_1 = require("./browser-manager");
const logger_1 = require("../utils/logger");
const Lead_1 = require("../models/Lead");
class GoogleMapsScraper {
    constructor() {
        this.baseUrl = 'https://www.google.com/maps';
        this.results = [];
        this.totalExtracted = 0;
        this.totalDuplicates = 0;
        this.totalFound = 0;
        this.scrapedCount = 0;
        this.browserManager = new browser_manager_1.PlaywrightBrowser();
    }
    async scrape(options) {
        const { keyword, location: _location, state, city, area, businessType: _businessType, limit = 1000, sessionId: _sessionId } = options;
        const searchQuery = this.buildSearchQuery(keyword, area, city, state);
        logger_1.logger.info(`Starting Google Maps scrape: "${searchQuery}" (limit: ${limit})`);
        try {
            const { page } = await this.browserManager.initialize();
            page.setDefaultTimeout(30000);
            await this.navigateToMaps(page);
            await this.searchBusinesses(page, keyword, searchQuery);
            await this.scrollAndExtract(page, limit, options);
            const storedLeads = await this.storeLeads(this.results);
            logger_1.logger.info(`Scrape completed: ${storedLeads.totalStored} leads stored, ${this.totalDuplicates} duplicates skipped`);
            await this.browserManager.close();
            return {
                success: true,
                message: 'Leads fetched successfully',
                totalExtracted: this.totalExtracted,
                totalStored: storedLeads.totalStored,
                totalDuplicates: this.totalDuplicates,
                leads: storedLeads.leads,
                totalFound: this.totalFound,
                scrapedCount: this.scrapedCount,
            };
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'Scrape failed:');
            await this.browserManager.close().catch(() => { });
            throw error;
        }
    }
    buildSearchQuery(keyword, area, city, state) {
        if (area && city && state) {
            return `${keyword} in ${area} ${city} ${state}`;
        }
        if (city && state) {
            return `${keyword} in ${city} ${state}`;
        }
        if (state) {
            return `${keyword} in ${state}`;
        }
        return keyword;
    }
    async navigateToMaps(page) {
        logger_1.logger.info('Navigating to Google Maps...');
        await page.goto(this.baseUrl, { waitUntil: 'networkidle' });
        await page.waitForSelector('[aria-label="Google Maps"]', { timeout: 10000 });
        logger_1.logger.info('Google Maps loaded');
    }
    async searchBusinesses(page, _keyword, searchQuery) {
        logger_1.logger.info(`Searching for: ${searchQuery}`);
        try {
            const searchBox = await page.waitForSelector('input#searchboxinput', { timeout: 10000 });
            if (searchBox) {
                await searchBox.fill(searchQuery);
                await page.keyboard.press('Enter');
                await page.waitForSelector('[role="main"]', { timeout: 15000 });
            }
        }
        catch (error) {
            logger_1.logger.warn('Search box not found, trying alternative selector');
            const searchBoxAlt = await page.waitForSelector('input[data-query="search"]', { timeout: 10000 });
            if (searchBoxAlt) {
                await searchBoxAlt.fill(searchQuery);
                await page.keyboard.press('Enter');
                await page.waitForSelector('[role="main"]', { timeout: 15000 });
            }
        }
        logger_1.logger.info('Search completed');
    }
    async scrollAndExtract(page, limit, options) {
        logger_1.logger.info(`Starting to scroll and extract (limit: ${limit})`);
        let maxScrollAttempts = 5;
        let scrollAttempts = 0;
        let lastCount = 0;
        let consistentCount = 0;
        while (scrollAttempts < maxScrollAttempts) {
            const businesses = await this.extractBusinessesFromPage(page, limit, options);
            const newCount = businesses.length;
            if (newCount > 0) {
                scrollAttempts = 0;
            }
            else {
                scrollAttempts++;
            }
            if (this.results.length === lastCount) {
                consistentCount++;
                if (consistentCount >= 3) {
                    logger_1.logger.info('No new results found, stopping extraction');
                    break;
                }
            }
            else {
                consistentCount = 0;
                lastCount = this.results.length;
            }
            this.totalFound = this.results.length;
            if (this.results.length >= limit) {
                logger_1.logger.info(`Reached limit of ${limit} businesses`);
                break;
            }
            await this.scrollToBottom(page);
            await page.waitForTimeout(1500);
        }
        logger_1.logger.info(`Extracted ${this.results.length} businesses`);
    }
    async scrollToBottom(page) {
        try {
            const resultsPanel = await page.$('[role="main"]');
            if (resultsPanel) {
                await resultsPanel.evaluate((el) => {
                    el.scrollTo(0, el.scrollHeight);
                });
            }
            else {
                await page.evaluate(() => {
                    window.scrollTo(0, document.body.scrollHeight);
                });
            }
        }
        catch (error) {
            logger_1.logger.warn(error instanceof Error ? error : new Error(String(error)), 'Scroll failed:');
        }
    }
    async extractBusinessesFromPage(page, limit, options) {
        const newBusinesses = [];
        const businessesSelector = 'div[role="article"]';
        await page.waitForSelector(businessesSelector, { timeout: 5000 });
        const businessCount = await page.count(businessesSelector);
        logger_1.logger.info(`Found ${businessCount} business cards`);
        for (let i = 0; i < businessCount && this.results.length < limit; i++) {
            try {
                const business = await this.extractSingleBusiness(page, i, options);
                if (business && !this.isDuplicate(business)) {
                    if (options.area && !business.isLocationValidated) {
                        logger_1.logger.debug(`Skipping ${business.companyName} - not in ${options.area}`);
                        this.totalDuplicates++;
                        continue;
                    }
                    this.results.push(business);
                    this.totalExtracted++;
                    this.scrapedCount++;
                    logger_1.logger.info(`Extracted: ${business.companyName} (${business.area || 'unknown area'})`);
                }
                else if (business) {
                    this.totalDuplicates++;
                    logger_1.logger.debug(`Duplicate skipped: ${business.companyName}`);
                }
            }
            catch (error) {
                logger_1.logger.warn(error instanceof Error ? error : new Error(String(error)), `Failed to extract business at index ${i}:`);
                continue;
            }
        }
        return newBusinesses;
    }
    async extractSingleBusiness(page, index, options) {
        const businessesSelector = 'div[role="article"]';
        const businessCard = await page.$$(businessesSelector);
        if (!businessCard || index >= businessCard.length) {
            return null;
        }
        try {
            await businessCard[index].click();
            await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
            try {
                await page.waitForSelector('h1.DUwDvf', { timeout: 5000 });
                await page.waitForTimeout(1000);
            }
            catch (error) {
                logger_1.logger.debug('Key elements not found, proceeding anyway');
                await page.waitForTimeout(2000);
            }
            const businessData = await this.extractBusinessDataFromDetails(page, options);
            await page.keyboard.press('Escape');
            await page.waitForTimeout(1000);
            return businessData;
        }
        catch (error) {
            logger_1.logger.warn(error instanceof Error ? error : new Error(String(error)), 'Error extracting business details:');
            return null;
        }
    }
    async extractBusinessDataFromDetails(page, options) {
        const { area, city, state } = options;
        const data = {
            id: crypto.randomUUID(),
            companyName: '',
            website: '',
            phone: '',
            email: '',
            address: '',
            category: '',
            rating: 0,
            reviewsCount: 0,
            source: 'google-maps',
            leadScore: 50,
            createdAt: new Date().toISOString(),
            area: area || undefined,
            city: city || undefined,
            state: state || undefined,
            businessType: options.businessType || options.keyword,
            fullSearchQuery: this.buildSearchQuery(options.keyword, area, city, state),
            locationRelevanceScore: 0,
            isLocationValidated: false,
        };
        try {
            const companyNameSelector = 'h1.DUwDvf';
            const companyName = await this.getTextContent(page, companyNameSelector);
            if (companyName)
                data.companyName = companyName;
            const categorySelector = 'button.DKv0N';
            const category = await this.getTextContent(page, categorySelector);
            if (category)
                data.category = category;
            const phoneSelector = 'button[aria-label*="Phone"]';
            const phone = await this.getTextContent(page, phoneSelector);
            if (phone)
                data.phone = phone.replace(/[^\d+]/g, '');
            const addressSelector = 'button[aria-label*="Address"]';
            const address = await this.getTextContent(page, addressSelector);
            if (address)
                data.address = address;
            const websiteSelectors = [
                'a[data-item-id*="website"]',
                'a[data-item-id*="authority"]',
                'a[aria-label*="website"]',
                'a[aria-label*="Website"]',
                'a[aria-label*="Web"]',
                'a[data-item-id*="info"]',
                'a:has(svg[aria-label*="website"])',
                'a:has(svg[aria-label*="Web"])',
                'a[href^="http"][href*="://"]',
            ];
            for (const sel of websiteSelectors) {
                const website = await this.getAttribute(page, sel, 'href');
                if (website && !website.includes('google.com/maps') && !website.includes('support.google') && !website.includes('maps.google')) {
                    data.website = website.startsWith('http') ? website : `https://${website}`;
                    break;
                }
            }
            if (!data.website) {
                try {
                    data.website = await page.evaluate(() => {
                        const panel = document.querySelector('[role="dialog"], div[role="main"]');
                        if (!panel)
                            return '';
                        const allLinks = panel.querySelectorAll('a[href]');
                        for (const link of Array.from(allLinks)) {
                            const href = link.getAttribute('href') || '';
                            const lower = href.toLowerCase();
                            if (lower.startsWith('http') &&
                                !lower.includes('google.com/maps') &&
                                !lower.includes('support.google') &&
                                !lower.includes('maps.google') &&
                                !lower.startsWith('javascript:') &&
                                !lower.startsWith('#')) {
                                return href.startsWith('http') ? href : `https://${href}`;
                            }
                        }
                        return '';
                    });
                }
                catch { }
            }
            const ratingSelector = 'span[aria-label*="stars"]';
            const ratingText = await this.getAttribute(page, ratingSelector, 'aria-label');
            if (ratingText) {
                const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
                if (ratingMatch) {
                    data.rating = parseFloat(ratingMatch[1]);
                }
            }
            const reviewsSelector = 'span[aria-label*="reviews"]';
            const reviewsText = await this.getAttribute(page, reviewsSelector, 'aria-label');
            if (reviewsText) {
                const reviewsMatch = reviewsText.match(/(\d+)/);
                if (reviewsMatch) {
                    data.reviewsCount = parseInt(reviewsMatch[1], 10);
                }
            }
            data.leadScore = this.calculateLeadScore(data);
            const relevanceScore = this.validateAreaRelevance(data, options.area, options.city, options.state);
            data.locationRelevanceScore = relevanceScore;
            data.isLocationValidated = relevanceScore > 50;
            logger_1.logger.debug(`Business: ${data.companyName}, Area: ${data.area}, Relevance: ${relevanceScore}, Validated: ${data.isLocationValidated}`);
            return data;
        }
        catch (error) {
            logger_1.logger.warn(error instanceof Error ? error : new Error(String(error)), 'Error extracting business data:');
            return data;
        }
    }
    validateAreaRelevance(business, area, city, state) {
        if (!area && !city && !state) {
            return 100;
        }
        let score = 0;
        const checks = [];
        if (area && business.address) {
            if (business.address.toLowerCase().includes(area.toLowerCase())) {
                score += 40;
                checks.push(`Area match in address: ${area}`);
            }
        }
        if (city && business.address) {
            if (business.address.toLowerCase().includes(city.toLowerCase())) {
                score += 30;
                checks.push(`City match in address: ${city}`);
            }
        }
        if (state && business.address) {
            if (business.address.toLowerCase().includes(state.toLowerCase())) {
                score += 20;
                checks.push(`State match in address: ${state}`);
            }
        }
        if (business.category) {
            score += 10;
            checks.push('Category match');
        }
        return Math.min(score, 100);
    }
    async getTextContent(page, selector) {
        try {
            const element = await page.$(selector);
            if (element) {
                return await element.innerText();
            }
        }
        catch (error) {
        }
        return null;
    }
    async getAttribute(page, selector, attribute) {
        try {
            const element = await page.$(selector);
            if (element) {
                return await element.getAttribute(attribute);
            }
        }
        catch (error) {
        }
        return null;
    }
    isDuplicate(business) {
        const existing = this.results.find((b) => b.companyName === business.companyName && b.phone === business.phone);
        return !!existing;
    }
    calculateLeadScore(data) {
        let score = 30;
        if (data.website)
            score += 20;
        if (data.phone)
            score += 10;
        if (data.email)
            score += 10;
        if (data.address)
            score += 5;
        if (data.category)
            score += 5;
        if (data.rating && data.rating >= 4.5) {
            score += 10;
        }
        if (data.reviewsCount && data.reviewsCount >= 50) {
            score += 5;
        }
        return Math.min(score, 100);
    }
    async storeLeads(leads) {
        const storedLeads = [];
        for (const lead of leads) {
            try {
                const existingLead = await Lead_1.Lead.findOne({
                    $or: [
                        { companyName: lead.companyName, phone: lead.phone },
                        { website: lead.website },
                    ],
                });
                if (existingLead) {
                    this.totalDuplicates++;
                    continue;
                }
                const newLead = new Lead_1.Lead({
                    companyName: lead.companyName,
                    website: lead.website || undefined,
                    phone: lead.phone || undefined,
                    email: lead.email || undefined,
                    address: lead.address || undefined,
                    category: lead.category || undefined,
                    rating: lead.rating || undefined,
                    reviewsCount: lead.reviewsCount || undefined,
                    source: lead.source,
                    sourceUrl: lead.sourceUrl || undefined,
                    area: lead.area || undefined,
                    city: lead.city || undefined,
                    state: lead.state || undefined,
                    businessType: lead.businessType || undefined,
                    businessStatus: lead.businessStatus || undefined,
                    ownerClaimed: lead.ownerClaimed || false,
                    searchedKeyword: lead.businessType || lead.keyword,
                    searchedLocation: lead.fullSearchQuery || undefined,
                    searchedArea: lead.area || undefined,
                    searchedCity: lead.city || undefined,
                    searchedState: lead.state || undefined,
                    fullSearchQuery: lead.fullSearchQuery || undefined,
                    matchedKeyword: lead.businessType || undefined,
                    leadScore: lead.leadScore,
                    locationConfidence: lead.locationRelevanceScore || 0,
                    validationStatus: lead.isLocationValidated ? 'validated' : 'needs-review',
                    websiteStatus: 'pending',
                    sourceMetadata: {
                        extractedAt: new Date().toISOString(),
                        businessType: lead.businessType,
                        locationRelevance: lead.locationRelevanceScore,
                        isLocationValidated: lead.isLocationValidated,
                    },
                    latitude: lead.latitude || undefined,
                    longitude: lead.longitude || undefined,
                    plusCode: lead.plusCode || undefined,
                    workingHours: lead.workingHours || undefined,
                });
                await newLead.save();
                storedLeads.push(lead);
                logger_1.logger.info({
                    saved: {
                        website: !!lead.website,
                        phone: !!lead.phone,
                        email: !!lead.email,
                        address: !!lead.address,
                        category: !!lead.category,
                        area: !!lead.area,
                        city: !!lead.city,
                        state: !!lead.state,
                        rating: lead.rating || 0,
                        reviews: lead.reviewsCount || 0,
                        leadScore: lead.leadScore,
                    },
                }, `Stored lead: ${lead.companyName}`);
            }
            catch (error) {
                logger_1.logger.warn(error instanceof Error ? error : new Error(String(error)), `Failed to store lead ${lead.companyName}:`);
            }
        }
        return { totalStored: storedLeads.length, leads: storedLeads };
    }
}
exports.GoogleMapsScraper = GoogleMapsScraper;
//# sourceMappingURL=google-maps.scraper.js.map