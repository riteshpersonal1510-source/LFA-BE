"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfficialWebsiteSource = void 0;
const logger_1 = require("../../utils/logger");
const base_source_1 = require("../../source-core/base-source");
const browser_pool_service_1 = require("../../services/browser-pool.service");
const SEARCH_ENGINES = [
    { name: 'google', url: 'https://www.google.com/search?q=' },
];
const CONTACT_KEYWORDS = ['contact', 'about', 'contact-us', 'about-us', 'team', 'location'];
class OfficialWebsiteSource extends base_source_1.BaseSource {
    constructor(config) {
        super('official-website', config);
    }
    async scrape(options) {
        const { keyword, location = '', limit = 20 } = options;
        logger_1.logger.info({ keyword, location, limit }, 'OfficialWebsiteSource: Starting scrape');
        if (!keyword || keyword.trim().length === 0) {
            return {
                success: false,
                message: 'Invalid keyword: keyword is required',
                totalExtracted: 0,
                totalStored: 0,
                totalDuplicates: 0,
                leads: [],
            };
        }
        const results = [];
        const searchQuery = location
            ? `${keyword} in ${location} official website`
            : `${keyword} official website`;
        const poolResource = await browser_pool_service_1.browserPool.acquire('official-website');
        const page = poolResource.page;
        try {
            const searchUrl = `${SEARCH_ENGINES[0].url}${encodeURIComponent(searchQuery)}`;
            await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });
            const links = await this.extractSearchLinks(page, limit * 3);
            const websites = this.filterBusinessWebsites(links);
            const batch = websites.slice(0, limit);
            for (const site of batch) {
                try {
                    const business = await this.scrapeWebsite(page, site.url, site.title, keyword);
                    if (business) {
                        results.push(business);
                    }
                }
                catch (error) {
                    const msg = error instanceof Error ? error.message : 'Unknown';
                    logger_1.logger.debug({ url: site.url, error: msg }, 'OfficialWebsiteSource: Failed to scrape site');
                }
                if (results.length >= limit)
                    break;
            }
            const stored = await this.storeLeads(results, {
                keyword,
                location,
            });
            logger_1.logger.info({
                totalExtracted: results.length,
                totalStored: stored.totalStored,
                totalDuplicates: stored.totalDuplicates,
            }, 'OfficialWebsiteSource: Scrape completed');
            return {
                success: results.length > 0,
                message: results.length > 0
                    ? `Found ${results.length} businesses from official websites`
                    : 'No businesses found from official websites',
                totalExtracted: results.length,
                totalStored: stored.totalStored,
                totalDuplicates: stored.totalDuplicates,
                leads: results,
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error({ err: message, keyword, location }, 'OfficialWebsiteSource: Scrape failed');
            return {
                success: false,
                message,
                totalExtracted: 0,
                totalStored: 0,
                totalDuplicates: 0,
                leads: [],
            };
        }
        finally {
            await browser_pool_service_1.browserPool.release(poolResource.page, 'official-website');
        }
    }
    async extractSearchLinks(page, maxLinks) {
        const links = [];
        try {
            const elements = await page.$$('div.g a[href^="http"]');
            for (const el of elements) {
                if (links.length >= maxLinks)
                    break;
                const href = await el.getAttribute('href').catch(() => null);
                const text = await el.textContent().catch(() => '');
                if (href && text && !href.includes('google.com')) {
                    const parent = await el.$('h3').catch(() => null);
                    const title = parent ? await parent.textContent().catch(() => text) : text;
                    links.push({
                        title: title || text,
                        url: href,
                        snippet: '',
                    });
                }
            }
        }
        catch (error) {
            logger_1.logger.warn({ err: error instanceof Error ? error.message : 'Unknown' }, 'OfficialWebsiteSource: extractSearchLinks failed');
        }
        return links;
    }
    filterBusinessWebsites(links) {
        const excludePatterns = [
            'facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com',
            'youtube.com', 'wikipedia.org', 'yelp.com', 'justdial.com',
            'indiamart.com', 'clutch.co', 'google.com/maps',
            'amazon.in', 'amazon.com', 'flipkart.com',
            'quora.com', 'reddit.com', 'pinterest.com',
            'blogspot.com', 'wordpress.com', 'medium.com',
        ];
        return links.filter(link => {
            const url = link.url.toLowerCase();
            return !excludePatterns.some(p => url.includes(p));
        });
    }
    async scrapeWebsite(page, url, siteTitle, keyword) {
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
            const title = await page.title().catch(() => siteTitle);
            const companyName = this.extractCompanyName(title, siteTitle, keyword);
            if (!companyName)
                return null;
            const email = await this.extractEmail(page);
            const phone = await this.extractPhone(page);
            const address = await this.extractAddress(page);
            const contactUrls = CONTACT_KEYWORDS.map(k => {
                const baseUrl = url.replace(/\/$/, '');
                return `${baseUrl}/${k}`;
            });
            let contactEmail = email;
            let contactPhone = phone;
            let contactAddress = address;
            if (!contactEmail || !contactPhone || !contactAddress) {
                for (const contactUrl of contactUrls) {
                    try {
                        await page.goto(contactUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
                        if (!contactEmail)
                            contactEmail = await this.extractEmail(page);
                        if (!contactPhone)
                            contactPhone = await this.extractPhone(page);
                        if (!contactAddress)
                            contactAddress = await this.extractAddress(page);
                        if (contactEmail && contactPhone)
                            break;
                    }
                    catch {
                        continue;
                    }
                }
            }
            return {
                id: `${companyName}-${url}`,
                companyName,
                website: url,
                email: contactEmail || undefined,
                phone: contactPhone || undefined,
                address: contactAddress || undefined,
                source: this.sourceName,
                sourceUrl: url,
                createdAt: new Date().toISOString(),
            };
        }
        catch (error) {
            logger_1.logger.debug({ url, err: error instanceof Error ? error.message : 'Unknown' }, 'OfficialWebsiteSource: scrapeWebsite failed');
            return null;
        }
    }
    extractCompanyName(title, siteTitle, _keyword) {
        const name = title || siteTitle;
        if (!name)
            return null;
        const cleaned = name
            .replace(/\s*[-–|—]\s*.*$/, '')
            .replace(/\s*Home\s*$/i, '')
            .replace(/\s*Official\s*$/i, '')
            .replace(/\s*Website\s*$/i, '')
            .trim();
        return cleaned.length > 1 ? cleaned : null;
    }
    async extractEmail(page) {
        try {
            const body = await page.textContent('body').catch(() => '');
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
            const emails = body.match(emailRegex);
            if (emails) {
                const valid = emails.filter((e) => {
                    const blocked = ['example.com', 'domain.com', 'yourdomain.com', 'email.com', '@email.com'];
                    return !blocked.some(b => e.toLowerCase().endsWith(b));
                });
                if (valid.length > 0) {
                    return valid[0];
                }
            }
            return null;
        }
        catch {
            return null;
        }
    }
    async extractPhone(page) {
        try {
            const body = await page.textContent('body').catch(() => '');
            const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;
            const phones = body.match(phoneRegex);
            if (phones) {
                const valid = phones.filter((p) => {
                    const digits = p.replace(/\D/g, '');
                    return digits.length >= 10 && digits.length <= 15;
                });
                if (valid.length > 0) {
                    return valid[0].trim();
                }
            }
            return null;
        }
        catch {
            return null;
        }
    }
    async extractAddress(page) {
        try {
            const addressPatterns = [
                'address',
                '[itemprop="address"]',
                '.address',
                '#address',
                '[class*="address"]',
                'footer',
            ];
            for (const pattern of addressPatterns) {
                try {
                    const el = await page.$(pattern);
                    if (el) {
                        const text = await el.textContent().catch(() => '');
                        if (text && text.trim().length > 10) {
                            return text.trim();
                        }
                    }
                }
                catch {
                    continue;
                }
            }
            return null;
        }
        catch {
            return null;
        }
    }
}
exports.OfficialWebsiteSource = OfficialWebsiteSource;
//# sourceMappingURL=scraper.js.map