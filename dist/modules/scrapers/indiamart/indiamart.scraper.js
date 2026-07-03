"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndiaMartScraper = void 0;
const logger_1 = require("../../../utils/logger");
const browser_manager_1 = require("../../../core/scraper-engine/browser-manager");
const lead_storage_1 = require("../../../core/scraper-engine/lead-storage");
const search_status_service_1 = require("../../../services/search-status.service");
const indiamart_extractor_1 = require("./indiamart.extractor");
const indiamart_queue_1 = require("./indiamart.queue");
const MAX_LISTINGS_PER_SESSION = -1;
class IndiaMartScraper {
    async scrape(options) {
        const { keyword, location = '', state, city, area, businessType, sessionId, semanticKeyword } = options;
        if (!keyword || keyword.trim().length === 0) {
            return {
                success: false, message: 'Invalid keyword', totalExtracted: 0,
                totalStored: 0, totalDuplicates: 0, leads: [], sourceResults: [],
            };
        }
        logger_1.logger.info({
            keyword, state, city, area, businessType,
        }, 'IndiaMartScraper: Starting');
        const allLeads = [];
        let totalExtracted = 0;
        let totalStored = 0;
        let totalDuplicates = 0;
        let stats = null;
        const { page } = await browser_manager_1.browserManager.acquire('indiamart');
        try {
            const listings = await (0, indiamart_extractor_1.extractListings)(page, keyword, city, area);
            const dedupedListings = this.deduplicateListings(listings);
            const limitedListings = dedupedListings.slice(0, MAX_LISTINGS_PER_SESSION);
            totalExtracted = limitedListings.length;
            if (sessionId) {
                search_status_service_1.searchStatus.updateLeadsFound(sessionId, totalExtracted);
            }
            if (limitedListings.length === 0) {
                logger_1.logger.info({ keyword }, 'IndiaMartScraper: No listings found');
                return {
                    success: false, message: 'No listings found on IndiaMart',
                    totalExtracted: 0, totalStored: 0, totalDuplicates: 0,
                    leads: [], sourceResults: [],
                };
            }
            const queue = new indiamart_queue_1.IndiaMartProfileQueue(page, {
                keyword,
                location,
                area,
                city,
                state,
                businessType: businessType || keyword,
            });
            const result = await queue.processAll(limitedListings);
            stats = result.stats;
            for (const lead of result.leads) {
                const stored = await lead_storage_1.leadStorage.storeLeads([lead], {
                    keyword,
                    location: area || location,
                    area,
                    city,
                    state,
                    businessType: businessType || keyword,
                    semanticKeyword,
                    sessionId,
                });
                if (stored.totalStored > 0) {
                    allLeads.push(lead);
                    totalStored++;
                }
                else if (stored.totalDuplicates > 0) {
                    totalDuplicates++;
                }
            }
            logger_1.logger.info({
                totalListings: stats.totalListingsFound,
                profilesOpened: stats.totalProfilesOpened,
                profilesFailed: stats.totalProfilesFailed,
                invalidRejected: stats.totalInvalidRejected,
                totalStored,
                totalDuplicates,
            }, 'IndiaMartScraper: Completed');
            return {
                success: allLeads.length > 0,
                message: allLeads.length > 0
                    ? `IndiaMart completed: ${allLeads.length} leads saved`
                    : 'No valid leads found on IndiaMart',
                totalExtracted,
                totalStored,
                totalDuplicates,
                leads: allLeads,
                sourceResults: [{
                        source: 'indiamart',
                        totalStored,
                        totalExtracted,
                        totalDuplicates,
                        success: allLeads.length > 0,
                    }],
            };
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown IndiaMart error';
            logger_1.logger.error({
                err: errMsg, keyword, sessionId,
                partialStored: allLeads.length,
            }, 'IndiaMartScraper: Failed');
            return {
                success: allLeads.length > 0,
                message: allLeads.length > 0
                    ? `IndiaMart completed with warnings: ${allLeads.length} leads`
                    : `IndiaMart failed: ${errMsg}`,
                totalExtracted,
                totalStored,
                totalDuplicates,
                leads: allLeads,
                sourceResults: [{
                        source: 'indiamart',
                        totalStored,
                        totalExtracted,
                        totalDuplicates,
                        success: allLeads.length > 0,
                        error: allLeads.length > 0 ? undefined : errMsg,
                    }],
            };
        }
        finally {
            await browser_manager_1.browserManager.release(page, 'indiamart');
        }
    }
    deduplicateListings(listings) {
        const seen = new Map();
        for (const l of listings) {
            const key = l.companyName.toLowerCase().trim();
            if (!seen.has(key)) {
                seen.set(key, l);
            }
        }
        return Array.from(seen.values());
    }
}
exports.IndiaMartScraper = IndiaMartScraper;
//# sourceMappingURL=indiamart.scraper.js.map