"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleMapsSource = void 0;
const logger_1 = require("../../utils/logger");
const base_source_1 = require("../../source-core/base-source");
const scraping_progress_1 = require("../../services/scraping-progress");
const search_query_builder_1 = require("../../services/search-query-builder");
const business_relevance_validator_1 = require("../../services/business-relevance-validator");
const browser_pool_service_1 = require("../../services/browser-pool.service");
const selectors_1 = require("./selectors");
const NAV_TIMEOUT = 30000;
const DETAIL_TIMEOUT = 15000;
const STALLED_LIMIT = 25;
const MAX_RETRIES_PER_DETAIL = 2;
class GoogleMapsSource extends base_source_1.BaseSource {
    constructor(config) {
        super('google-maps', config);
    }
    async scrape(options) {
        const { keyword, location = '', state, city, area, businessType, sessionId: providedSessionId } = options;
        const hasHyperlocal = !!(area && city && state);
        const sessionId = providedSessionId || scraping_progress_1.scrapingProgress.generateSessionId();
        const queries = search_query_builder_1.searchQueryBuilder.build({
            businessType: businessType || keyword,
            state,
            city,
            area,
            sources: ['google-maps'],
        });
        const sourceQuery = queries[0];
        const searchQuery = sourceQuery?.query || `${businessType || keyword} in ${area || city || location || ''}`;
        const fullSearchQuery = sourceQuery?.fullSearchQuery || searchQuery;
        scraping_progress_1.scrapingProgress.createSession(sessionId, {
            keyword,
            location: location || '',
            area: area || '',
            city: city || '',
            state: state || '',
            businessType: businessType || keyword,
        });
        logger_1.logger.info({
            keyword, location, state, city, area, businessType,
            searchQuery, sessionId,
            hasHyperlocal,
        }, 'GoogleMapsSource: Starting hyperlocal scrape');
        if (!keyword || keyword.trim().length === 0) {
            logger_1.logger.error({}, 'GoogleMapsSource: Empty keyword provided');
            return {
                success: false,
                message: 'Invalid keyword: keyword is required',
                totalExtracted: 0,
                totalStored: 0,
                totalDuplicates: 0,
                leads: [],
            };
        }
        const allLeads = [];
        const poolResource = await browser_pool_service_1.browserPool.acquire('google-maps');
        const page = poolResource.page;
        try {
            page.setDefaultTimeout(NAV_TIMEOUT);
            page.setDefaultNavigationTimeout(NAV_TIMEOUT);
            const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;
            logger_1.logger.info({ url: searchUrl, searchQuery, fullSearchQuery, sessionId }, 'GoogleMapsSource: Navigating');
            await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
            logger_1.logger.info({ sessionId }, 'GoogleMapsSource: Google Maps loaded');
            await page.waitForTimeout(4000);
            let hasFeed = !!(await page.$('[role="feed"]').catch(() => null));
            if (!hasFeed) {
                logger_1.logger.info({ sessionId }, 'GoogleMapsSource: No feed initially, waiting for results...');
                await page.waitForTimeout(3000);
                hasFeed = !!(await page.$('[role="feed"]').catch(() => null));
            }
            if (!hasFeed) {
                logger_1.logger.info({ sessionId }, 'GoogleMapsSource: Trying search input fallback');
                const searchInput = await page.$('input#searchboxinput').catch(() => null);
                if (searchInput) {
                    await searchInput.click();
                    await searchInput.fill('');
                    await page.type('input#searchboxinput', searchQuery, { delay: 20 });
                    await page.keyboard.press('Enter');
                    await page.waitForTimeout(5000);
                }
            }
            const allScrapedNames = new Set();
            const allScrapedPlaceIds = new Set();
            let stalledScrolls = 0;
            let consecutiveEmptyExtracts = 0;
            for (let scrollAttempt = 0;; scrollAttempt++) {
                if (stalledScrolls >= STALLED_LIMIT) {
                    const recovered = await this.tryQueryVariations(page, searchQuery);
                    if (recovered) {
                        stalledScrolls = Math.max(0, stalledScrolls - 5);
                        logger_1.logger.info({ sessionId }, 'GoogleMapsSource: Recovered via query variation');
                    }
                    else {
                        logger_1.logger.info({
                            sessionId, totalFound: allScrapedNames.size,
                            scrollAttempt,
                        }, 'GoogleMapsSource: STOP - stalled scroll limit reached');
                        break;
                    }
                }
                const newCardCount = await this.enhancedScrollFeed(page);
                const newCards = await this.detectCardData(page, allScrapedNames, allScrapedPlaceIds);
                if (newCards.length === 0) {
                    stalledScrolls++;
                    if (stalledScrolls === 3) {
                        const retried = await this.retryFailedQuery(page, searchQuery);
                        if (retried) {
                            stalledScrolls = 1;
                            logger_1.logger.info({ sessionId }, 'GoogleMapsSource: Recovered via retry');
                        }
                    }
                    scraping_progress_1.scrapingProgress.updateProgress(sessionId, {
                        totalFound: allScrapedNames.size,
                    });
                    logger_1.logger.info({
                        sessionId, stalledScrolls, maxStalled: STALLED_LIMIT,
                        totalFound: allScrapedNames.size,
                        scrollAttempt,
                        cardsInFeed: newCardCount,
                    }, 'GoogleMapsSource: No new cards this scroll');
                    continue;
                }
                stalledScrolls = 0;
                for (const cardData of newCards) {
                    const key = `${cardData.companyName}|${cardData.address || ''}`;
                    allScrapedNames.add(key);
                    if (cardData.placeId)
                        allScrapedPlaceIds.add(cardData.placeId);
                }
                scraping_progress_1.scrapingProgress.updateProgress(sessionId, {
                    totalFound: allScrapedNames.size,
                });
                for (const cardLead of newCards) {
                    try {
                        for (let retry = 0; retry <= MAX_RETRIES_PER_DETAIL; retry++) {
                            const ok = await this.extractSingleDetail(page, cardLead);
                            if (ok) {
                                break;
                            }
                            if (retry < MAX_RETRIES_PER_DETAIL) {
                                logger_1.logger.info({ business: cardLead.companyName, retry: retry + 1 }, 'GoogleMapsSource: Retrying detail extraction');
                                await page.waitForTimeout(1000);
                            }
                        }
                        scraping_progress_1.scrapingProgress.incrementScraped(sessionId);
                        const relevance = business_relevance_validator_1.businessRelevanceValidator.validate(cardLead.companyName, cardLead.category, businessType || keyword);
                        if (!relevance.relevant) {
                            scraping_progress_1.scrapingProgress.incrementRejected(sessionId);
                            logger_1.logger.info({
                                business: cardLead.companyName,
                                reason: 'business_type_mismatch',
                                keyword,
                                score: relevance.score,
                            }, 'GoogleMapsSource: Rejected - type mismatch');
                            continue;
                        }
                        cardLead.relevanceScore = relevance.score;
                        cardLead.validatedCategory = relevance.validatedCategory;
                        if (hasHyperlocal && area) {
                            const areaCheck = business_relevance_validator_1.businessRelevanceValidator.validateLocation(cardLead.address, area, city, state);
                            cardLead.locationRelevanceScore = areaCheck.score;
                            if (!areaCheck.relevant) {
                                scraping_progress_1.scrapingProgress.incrementRejected(sessionId);
                                logger_1.logger.info({
                                    business: cardLead.companyName,
                                    address: cardLead.address,
                                    reason: 'area_mismatch',
                                    areaCheck,
                                }, 'GoogleMapsSource: Rejected - area mismatch');
                                continue;
                            }
                        }
                        const stored = await this.storeLeads([cardLead], {
                            keyword,
                            location: area || location,
                            area,
                            city,
                            state,
                            businessType: businessType || keyword,
                            fullSearchQuery,
                        });
                        if (stored.totalStored > 0) {
                            scraping_progress_1.scrapingProgress.incrementSaved(sessionId);
                            allLeads.push(cardLead);
                            logger_1.logger.info({
                                business: cardLead.companyName,
                                sessionId,
                                totalSaved: allLeads.length,
                            }, 'GoogleMapsSource: Lead saved');
                        }
                        else if (stored.totalDuplicates > 0) {
                            scraping_progress_1.scrapingProgress.incrementDuplicates(sessionId);
                            logger_1.logger.info({
                                business: cardLead.companyName,
                            }, 'GoogleMapsSource: Lead duplicate - skipped');
                        }
                    }
                    catch (detailErr) {
                        scraping_progress_1.scrapingProgress.incrementRejected(sessionId);
                        logger_1.logger.warn({
                            err: detailErr instanceof Error ? detailErr.message : String(detailErr),
                            business: cardLead.companyName,
                            sessionId,
                        }, 'GoogleMapsSource: Detail extraction failed');
                    }
                }
                if (allLeads.length > 0 && allLeads.length % 10 === 0) {
                    logger_1.logger.info({
                        sessionId,
                        totalFound: allScrapedNames.size,
                        totalSaved: allLeads.length,
                        scrollAttempt,
                    }, 'GoogleMapsSource: Progress update');
                }
                if (newCards.length <= 3) {
                    consecutiveEmptyExtracts++;
                }
                else {
                    consecutiveEmptyExtracts = 0;
                }
                if (consecutiveEmptyExtracts >= 5 && stalledScrolls > 3) {
                    logger_1.logger.info({
                        sessionId, totalFound: allScrapedNames.size,
                    }, 'GoogleMapsSource: STOP - diminishing returns');
                    break;
                }
            }
            scraping_progress_1.scrapingProgress.completeSession(sessionId);
            logger_1.logger.info({
                sessionId,
                totalFound: allScrapedNames.size,
                totalSaved: allLeads.length,
            }, 'GoogleMapsSource: Scrape completed');
            return {
                success: allLeads.length > 0,
                message: allLeads.length > 0
                    ? `Google Maps completed: ${allLeads.length} saved, ${scraping_progress_1.scrapingProgress.getProgress(sessionId)?.totalDuplicates || 0} duplicates`
                    : 'No relevant businesses found',
                totalExtracted: allScrapedNames.size,
                totalStored: allLeads.length,
                totalDuplicates: scraping_progress_1.scrapingProgress.getProgress(sessionId)?.totalDuplicates || 0,
                leads: allLeads,
            };
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown scraping error';
            scraping_progress_1.scrapingProgress.failSession(sessionId, errMsg);
            const progress = scraping_progress_1.scrapingProgress.getProgress(sessionId);
            const actuallyStored = progress?.totalSaved || allLeads.length || 0;
            const actuallyFound = progress?.totalFound || 0;
            const errStack = error instanceof Error ? error.stack : undefined;
            logger_1.logger.error({
                err: errMsg, stack: errStack,
                keyword, location, area, city, state, sessionId,
                actuallyStored, actuallyFound,
            }, 'GoogleMapsSource: Failed - partial data may exist in MongoDB');
            return {
                success: actuallyStored > 0,
                message: actuallyStored > 0
                    ? `Google Maps completed with warnings: stored ${actuallyStored} leads before error`
                    : `Google Maps failed: ${errMsg}`,
                totalExtracted: actuallyFound,
                totalStored: actuallyStored,
                totalDuplicates: progress?.totalDuplicates || 0,
                leads: allLeads,
            };
        }
        finally {
            await browser_pool_service_1.browserPool.release(page, 'google-maps');
        }
    }
    async scrollFeed(page) {
        try {
            const feed = await page.$('[role="feed"]');
            if (feed) {
                await page.evaluate(() => {
                    const el = document.querySelector('[role="feed"]');
                    if (el) {
                        const before = el.scrollTop;
                        el.scrollTop = el.scrollHeight;
                        if (el.scrollTop === before) {
                            el.scrollTop += 500;
                        }
                    }
                });
                return;
            }
            await page.evaluate(() => {
                const main = document.querySelector('div[role="main"]');
                if (main) {
                    const before = main.scrollTop;
                    main.scrollTop = main.scrollHeight;
                    if (main.scrollTop === before) {
                        main.scrollTop += 500;
                    }
                }
                else {
                    window.scrollBy(0, 600);
                }
            });
        }
        catch {
            await page.evaluate(() => window.scrollBy(0, 600)).catch(() => { });
        }
    }
    async detectCardData(page, existingNames, existingPlaceIds) {
        try {
            const cards = await page.evaluate(({ known }) => {
                const cardSelectors = [
                    'div.Nv2PK',
                    'div[role="article"]',
                    'a[href*="maps/place/"]',
                ];
                let elements = [];
                for (const sel of cardSelectors) {
                    const found = document.querySelectorAll(sel);
                    if (found.length > 0) {
                        elements = Array.from(found);
                        break;
                    }
                }
                const leads = [];
                const nameFilter = new Set(known);
                for (const card of elements) {
                    const nameEl = card.querySelector('div.qBF1Pd.fontHeadlineSmall, .fontHeadlineSmall, [aria-label][role="button"]');
                    const name = nameEl?.textContent?.trim() || '';
                    if (!name)
                        continue;
                    const ratingEl = card.querySelector('span[role="img"][aria-label*="stars"]');
                    let rating = 0;
                    let reviewsCount = 0;
                    if (ratingEl) {
                        const label = ratingEl.getAttribute('aria-label') || '';
                        const m = label.match(/(\d+\.?\d*)/);
                        if (m)
                            rating = parseFloat(m[1]);
                        const reviewMatch = label.match(/([\d,]+)\s*reviews?/i);
                        if (reviewMatch)
                            reviewsCount = parseInt(reviewMatch[1].replace(/,/g, ''), 10);
                    }
                    const secondaryEls = card.querySelectorAll('.W4Efsd, .W4Efsd span, [aria-label]');
                    const secondaryText = Array.from(secondaryEls)
                        .map((el) => el.textContent || '')
                        .join(' · ');
                    const segments = secondaryText
                        .split('·')
                        .map((s) => s.trim())
                        .filter(Boolean);
                    let category = '';
                    let address = '';
                    for (const seg of segments) {
                        const lower = seg.toLowerCase();
                        if (lower.match(/^[\d.]+$/) ||
                            lower.startsWith('$') ||
                            lower.includes('reviews') ||
                            lower.includes('star') ||
                            seg.trim().length > 80) {
                            continue;
                        }
                        if (!category && !seg.includes(name)) {
                            category = seg;
                        }
                        else if (seg !== category &&
                            !seg.includes(name) &&
                            !seg.match(/^[\d.]+$/)) {
                            if (!address)
                                address = seg;
                            else if (address.length + seg.length < 200)
                                address += ', ' + seg;
                        }
                    }
                    const link = card.querySelector('a.hfpxzc');
                    const href = link?.getAttribute('href') || '';
                    const placeIdMatch = href.match(/maps\/place\/([^/]+)/);
                    const placeId = placeIdMatch
                        ? decodeURIComponent(placeIdMatch[1])
                        : '';
                    const duplicateKey = `${name}|${address}`;
                    if (nameFilter.has(duplicateKey))
                        continue;
                    nameFilter.add(duplicateKey);
                    leads.push({
                        id: placeId || `${name}-${address}`,
                        companyName: name,
                        rating,
                        reviewsCount,
                        category,
                        address,
                        href,
                        placeId,
                        source: 'google-maps',
                        sourceUrl: href,
                        createdAt: new Date().toISOString(),
                    });
                }
                return leads;
            }, { known: Array.from(existingNames) });
            const uniqueCards = [];
            for (const card of cards) {
                if (card.placeId && existingPlaceIds.has(card.placeId))
                    continue;
                if (card.placeId)
                    existingPlaceIds.add(card.placeId);
                uniqueCards.push(card);
            }
            return uniqueCards;
        }
        catch (error) {
            logger_1.logger.warn({ err: error instanceof Error ? error.message : String(error) }, 'GoogleMapsSource: detectCardData failed');
            return [];
        }
    }
    async extractSingleDetail(page, lead) {
        try {
            let clicked = false;
            if (lead.href) {
                try {
                    await page.goto(lead.href, {
                        waitUntil: 'domcontentloaded',
                        timeout: DETAIL_TIMEOUT,
                    });
                    clicked = true;
                }
                catch (navError) {
                    logger_1.logger.warn({
                        err: navError instanceof Error ? navError.message : String(navError), company: lead.companyName,
                    }, 'Navigation to detail failed, trying click');
                }
            }
            if (!clicked) {
                try {
                    const cardLink = await page.$(`a[href*="${encodeURIComponent(lead.placeId || lead.companyName)}"]`);
                    if (cardLink) {
                        await cardLink.scrollIntoViewIfNeeded().catch(() => { });
                        await page.waitForTimeout(300);
                        await cardLink.click().catch(() => { });
                        await page.waitForTimeout(1500);
                        clicked = true;
                    }
                }
                catch { }
            }
            if (!clicked) {
                return false;
            }
            await page.waitForSelector('[role="dialog"], h1.DUwDvf', {
                timeout: DETAIL_TIMEOUT,
            }).catch(() => { });
            await page.waitForTimeout(1200);
            try {
                await page.evaluate((scrollSel) => {
                    const panel = document.querySelector(scrollSel);
                    if (panel) {
                        panel.scrollTop = panel.scrollHeight;
                        setTimeout(() => { panel.scrollTop = panel.scrollHeight; }, 200);
                    }
                }, selectors_1.googleMapsSelectors.detailPanelScroll);
                await page.waitForTimeout(1000);
            }
            catch { }
            await this.extractWebsiteLayered(page, lead);
            await this.extractPhoneLayered(page, lead);
            const addressText = await (0, selectors_1.getFirstMatchText)(page, selectors_1.googleMapsSelectors.detailAddress);
            if (addressText) {
                lead.address = this.cleanDetailText(addressText, ['Address:']);
            }
            const categoryText = await (0, selectors_1.getFirstMatchText)(page, selectors_1.googleMapsSelectors.detailCategory);
            if (categoryText && categoryText.length < 80) {
                lead.category = this.cleanDetailText(categoryText, ['Category:']);
            }
            await page.keyboard.press('Escape').catch(() => { });
            await page.waitForTimeout(500);
            return true;
        }
        catch (error) {
            logger_1.logger.warn({
                err: error instanceof Error ? error.message : String(error),
                company: lead.companyName,
            }, 'Detail extract error');
            await page.keyboard.press('Escape').catch(() => { });
            await page.waitForTimeout(300);
            return false;
        }
    }
    async extractWebsiteLayered(page, lead) {
        let websiteFound = false;
        const websiteHref = await (0, selectors_1.getFirstMatchAttribute)(page, selectors_1.googleMapsSelectors.detailWebsite, 'href');
        if (websiteHref) {
            const resolved = this.normalizeWebsite(websiteHref);
            if (resolved && this.isValidWebsite(resolved)) {
                lead.website = resolved;
                websiteFound = true;
            }
        }
        if (!websiteFound) {
            const extracted = await (0, selectors_1.extractWebsiteFromDetailPanel)(page);
            if (extracted) {
                const normalized = this.normalizeWebsite(extracted);
                if (normalized && this.isValidWebsite(normalized)) {
                    lead.website = normalized;
                    websiteFound = true;
                }
            }
        }
        if (!websiteFound) {
            try {
                const domainFromCategory = lead.category?.trim();
                if (domainFromCategory && domainFromCategory.includes('.')) {
                    const candidate = `https://${domainFromCategory}`;
                    if (this.isValidWebsite(candidate)) {
                        lead.website = candidate;
                        websiteFound = true;
                    }
                }
            }
            catch { }
        }
        if (websiteFound && lead.website) {
            logger_1.logger.info({ business: lead.companyName, website: lead.website }, 'GoogleMapsSource: Website found');
        }
    }
    async extractPhoneLayered(page, lead) {
        const phoneText = await (0, selectors_1.getFirstMatchText)(page, selectors_1.googleMapsSelectors.detailPhone);
        if (phoneText) {
            const normalized = this.normalizePhone(phoneText);
            if (normalized) {
                lead.phone = normalized;
                return;
            }
        }
        const extractedPhone = await (0, selectors_1.extractPhoneFromDetailPanel)(page);
        if (extractedPhone) {
            const normalized = this.normalizePhone(extractedPhone);
            if (normalized) {
                lead.phone = normalized;
                return;
            }
        }
        try {
            const allText = await page.evaluate(() => {
                const panel = document.querySelector('[role="dialog"], div[role="main"]');
                if (!panel)
                    return '';
                return panel.textContent || '';
            });
            const phonePattern = /(\+?91[\s-]?)?[6-9]\d{9}/g;
            const match = allText.match(phonePattern);
            if (match) {
                lead.phone = match[0].replace(/[\s-]/g, '');
            }
        }
        catch { }
    }
    isValidWebsite(url) {
        if (!url || url.trim() === '')
            return false;
        const lower = url.toLowerCase().trim();
        if (lower.includes('google.com/maps'))
            return false;
        if (lower.includes('support.google'))
            return false;
        if (lower.includes('maps.google'))
            return false;
        if (lower.startsWith('javascript:'))
            return false;
        if (lower.startsWith('#'))
            return false;
        if (!lower.startsWith('http://') && !lower.startsWith('https://'))
            return false;
        try {
            new URL(lower);
            return true;
        }
        catch {
            return false;
        }
    }
    normalizeWebsite(url) {
        let normalized = this.resolveGoogleRedirect(url.trim());
        if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
            normalized = `https://${normalized}`;
        }
        try {
            const parsed = new URL(normalized);
            parsed.hash = '';
            return parsed.toString().replace(/\/$/, '');
        }
        catch {
            return normalized;
        }
    }
    resolveGoogleRedirect(url) {
        try {
            const parsed = new URL(url);
            const destination = parsed.searchParams.get('q') || parsed.searchParams.get('url');
            if (parsed.hostname.includes('google.') && destination) {
                return destination;
            }
        }
        catch { }
        return url;
    }
    normalizePhone(phone) {
        let cleaned = phone.replace(/[\s\-().]/g, '');
        cleaned = cleaned.replace(/^(?:\+?91)?(\d{10})$/, (_, d) => d);
        const digits = cleaned.replace(/[^\d]/g, '');
        if (digits.length === 10 && digits.startsWith('0'))
            return digits.slice(1);
        if (digits.length === 11 && digits.startsWith('0'))
            return digits.slice(1);
        if (digits.length === 12 && digits.startsWith('91'))
            return digits.slice(2);
        if (digits.length === 13 && digits.startsWith('+91'))
            return digits.slice(3);
        if (digits.length >= 10)
            return digits;
        return '';
    }
    cleanDetailText(text, prefixes) {
        let cleaned = text.trim();
        for (const prefix of prefixes) {
            cleaned = cleaned.replace(new RegExp(`^${prefix}\\s*`, 'i'), '');
        }
        return cleaned.trim();
    }
    async waitForContentStable(page, timeout = 5000) {
        try {
            await page.evaluate((waitMs) => {
                return new Promise((resolve) => {
                    const target = document.querySelector('[role="feed"]') || document.querySelector('div[role="main"]');
                    if (!target) {
                        resolve();
                        return;
                    }
                    let timer = null;
                    const observer = new MutationObserver(() => {
                        if (timer)
                            clearTimeout(timer);
                        timer = setTimeout(() => {
                            observer.disconnect();
                            resolve();
                        }, waitMs);
                    });
                    observer.observe(target, { childList: true, subtree: true, attributes: false });
                    setTimeout(() => {
                        observer.disconnect();
                        resolve();
                    }, timeout);
                });
            }, 800);
            return true;
        }
        catch {
            await page.waitForTimeout(1500);
            return false;
        }
    }
    async enhancedScrollFeed(page) {
        try {
            const beforeCount = await page.evaluate(() => {
                const feed = document.querySelector('[role="feed"]');
                if (feed)
                    return feed.children.length;
                const main = document.querySelector('div[role="main"]');
                if (main)
                    return main.querySelectorAll('a[href*="maps/place/"]').length;
                return 0;
            });
            await this.scrollFeed(page);
            await page.waitForTimeout(500);
            const stable = await this.waitForContentStable(page, 3000);
            if (stable) {
                await page.waitForTimeout(300);
            }
            else {
                await page.waitForTimeout(1000);
            }
            const afterCount = await page.evaluate(() => {
                const feed = document.querySelector('[role="feed"]');
                if (feed)
                    return feed.children.length;
                const main = document.querySelector('div[role="main"]');
                if (main)
                    return main.querySelectorAll('a[href*="maps/place/"]').length;
                return 0;
            });
            const newCardsCount = afterCount - beforeCount;
            if (newCardsCount <= 0) {
                await page.waitForTimeout(1000);
                const retryCount = await page.evaluate(() => {
                    const feed = document.querySelector('[role="feed"]');
                    if (feed) {
                        feed.scrollTop = feed.scrollHeight;
                        return feed.children.length;
                    }
                    const main = document.querySelector('div[role="main"]');
                    if (main) {
                        main.scrollTop = main.scrollHeight;
                        return main.querySelectorAll('a[href*="maps/place/"]').length;
                    }
                    window.scrollBy(0, 400);
                    return 0;
                });
                await page.waitForTimeout(1000);
                return retryCount - beforeCount;
            }
            return newCardsCount;
        }
        catch {
            await page.evaluate(() => window.scrollBy(0, 400)).catch(() => { });
            await page.waitForTimeout(1500);
            return 0;
        }
    }
    async retryFailedQuery(page, searchQuery) {
        try {
            const searchInput = await page.$('input#searchboxinput').catch(() => null);
            if (searchInput) {
                await searchInput.click();
                await searchInput.fill('');
                await page.type('input#searchboxinput', searchQuery, { delay: 15 });
                await page.keyboard.press('Enter');
                await page.waitForTimeout(5000);
                const hasFeed = !!(await page.$('[role="feed"]').catch(() => null));
                return hasFeed;
            }
            return false;
        }
        catch {
            return false;
        }
    }
    async tryQueryVariations(page, baseQuery) {
        const variations = [
            baseQuery,
            baseQuery.replace(/ in /g, ' '),
            baseQuery.replace(/ near /g, ' '),
        ];
        for (const variation of variations) {
            if (variation === baseQuery)
                continue;
            const ok = await this.retryFailedQuery(page, variation);
            if (ok)
                return true;
        }
        return false;
    }
}
exports.GoogleMapsSource = GoogleMapsSource;
//# sourceMappingURL=scraper.js.map