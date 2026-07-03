"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClutchSource = void 0;
const logger_1 = require("../../utils/logger");
const base_source_1 = require("../../source-core/base-source");
const selectors_1 = require("./selectors");
const browser_pool_service_1 = require("../../services/browser-pool.service");
class ClutchSource extends base_source_1.BaseSource {
    constructor(config) {
        super('clutch', config);
    }
    async scrape(options) {
        const { keyword, location = 'United States', limit = 50 } = options;
        logger_1.logger.info(`ClutchSource: Starting scrape for "${keyword}"`);
        if (!keyword || keyword.trim().length === 0) {
            logger_1.logger.error({}, 'ClutchSource: Empty keyword provided');
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
        let totalExtracted = 0;
        let totalDuplicates = 0;
        const poolResource = await browser_pool_service_1.browserPool.acquire('clutch');
        const page = poolResource.page;
        try {
            await page.goto('https://clutch.co', { waitUntil: 'networkidle' });
            await this.searchBusinesses(page, keyword, location);
            const duplicates = await this.extractBusinesses(page, limit, results);
            const stored = await this.storeLeads(results);
            totalExtracted = results.length;
            totalDuplicates = duplicates;
            return {
                success: true,
                message: 'Clutch scraping completed',
                totalExtracted,
                totalStored: stored.totalStored,
                totalDuplicates,
                leads: stored.leads,
            };
        }
        catch (error) {
            logger_1.logger.error('ClutchSource: Scraping failed:', error);
            throw new Error(`Clutch scraping failed: ${error.message}`);
        }
        finally {
            await browser_pool_service_1.browserPool.release(page, 'clutch');
        }
    }
    async searchBusinesses(page, keyword, location) {
        logger_1.logger.info('ClutchSource: Searching for businesses...');
        try {
            await page.waitForSelector(selectors_1.clutchSelectors.searchInput, { timeout: 10000 });
            await page.fill(selectors_1.clutchSelectors.searchInput, keyword);
            await page.keyboard.press('Enter');
            await page.waitForSelector(selectors_1.clutchSelectors.businessCard, { timeout: 15000 });
        }
        catch (error) {
            logger_1.logger.warn('ClutchSource: Search failed, trying alternative approach');
            await page.goto(`https://clutch.co/${location.replace(/\s+/g, '-').toLowerCase()}/${keyword.replace(/\s+/g, '-').toLowerCase()}`, {
                waitUntil: 'networkidle',
            });
        }
        logger_1.logger.info('ClutchSource: Search completed');
    }
    async extractBusinesses(page, limit, results) {
        logger_1.logger.info(`ClutchSource: Extracting businesses (limit: ${limit})`);
        let duplicates = 0;
        while (results.length < limit) {
            const businesses = await page.$$(selectors_1.clutchSelectors.businessCard);
            if (businesses.length === 0) {
                break;
            }
            for (const business of businesses) {
                if (results.length >= limit)
                    break;
                try {
                    const data = await this.extractBusinessData(page, business);
                    if (data && !this.isDuplicate(data, results)) {
                        data.source = 'clutch';
                        data.leadScore = this.calculateLeadScore(data);
                        results.push(data);
                    }
                    else if (data) {
                        duplicates++;
                    }
                }
                catch (error) {
                    logger_1.logger.warn(error instanceof Error ? error : new Error(String(error)), 'ClutchSource: Failed to extract business:');
                    continue;
                }
            }
            await page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
            });
            await page.waitForTimeout(2000);
        }
        logger_1.logger.info(`ClutchSource: Extracted ${results.length} businesses`);
        return duplicates;
    }
    async extractBusinessData(page, businessElement) {
        try {
            const data = {
                id: crypto.randomUUID(),
                companyName: '',
                phone: '',
                website: '',
                email: '',
                address: '',
                category: '',
                rating: 0,
                reviewsCount: 0,
                sourceUrl: '',
                createdAt: new Date().toISOString(),
            };
            const companyName = await this.getText(page, businessElement, '.company_title');
            if (companyName)
                data.companyName = companyName;
            const ratingText = await this.getText(page, businessElement, '.rating');
            if (ratingText) {
                const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
                if (ratingMatch)
                    data.rating = parseFloat(ratingMatch[1]);
            }
            const category = await this.getText(page, businessElement, '.service_cluster');
            if (category)
                data.category = category;
            return data;
        }
        catch (error) {
            logger_1.logger.warn('ClutchSource: Failed to extract business data:', error);
            return null;
        }
    }
    async getText(_page, context, selector) {
        try {
            const element = await context.$(selector);
            if (element)
                return await element.innerText();
        }
        catch (error) { }
        return null;
    }
    isDuplicate(business, existing) {
        return existing.some((b) => b.companyName === business.companyName && b.phone === business.phone);
    }
}
exports.ClutchSource = ClutchSource;
//# sourceMappingURL=scraper.js.map