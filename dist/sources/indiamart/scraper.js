"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndiaMartSource = void 0;
const logger_1 = require("../../utils/logger");
const base_source_1 = require("../../source-core/base-source");
const scraping_progress_1 = require("../../services/scraping-progress");
const business_relevance_validator_1 = require("../../services/business-relevance-validator");
const indiamart_scraper_1 = require("../../modules/scrapers/indiamart/indiamart.scraper");
const newScraper = new indiamart_scraper_1.IndiaMartScraper();
function toLeadData(lead) {
    return {
        id: lead.placeId || `${lead.companyName}-${Date.now()}`,
        companyName: lead.companyName,
        website: lead.website,
        phone: lead.phone,
        email: lead.email,
        address: lead.address,
        category: lead.category,
        rating: lead.rating,
        reviewsCount: lead.reviewsCount,
        source: lead.source || 'indiamart',
        sourceUrl: lead.sourceUrl,
        href: lead.href,
        placeId: lead.placeId,
        createdAt: new Date().toISOString(),
        area: lead.area,
        city: lead.city,
        state: lead.state,
        businessType: lead.businessType,
        fullSearchQuery: lead.fullSearchQuery,
        relevanceScore: lead.relevanceScore,
        validatedCategory: lead.validatedCategory,
        sources: lead.sources || [lead.source],
    };
}
class IndiaMartSource extends base_source_1.BaseSource {
    constructor(config) {
        super('indiamart', config);
    }
    async scrape(options) {
        const { keyword, location = '', state, city, area, businessType, sessionId } = options;
        if (!keyword || keyword.trim().length === 0) {
            logger_1.logger.error({}, 'IndiaMartSource: Empty keyword provided');
            return {
                success: false,
                message: 'Invalid keyword: keyword is required',
                totalExtracted: 0,
                totalStored: 0,
                totalDuplicates: 0,
                leads: [],
            };
        }
        logger_1.logger.info({
            keyword, state, city, area, businessType,
        }, 'IndiaMartSource: Delegating to new scraper module');
        const engineOptions = {
            keyword: businessType || keyword,
            location: location || '',
            sources: ['indiamart'],
            limit: 1000,
            state,
            city,
            area,
            businessType: businessType || keyword,
            sessionId: sessionId || scraping_progress_1.scrapingProgress.generateSessionId(),
        };
        try {
            const result = await newScraper.scrape(engineOptions);
            const leads = result.leads.map(toLeadData);
            const validatedLeads = [];
            for (const lead of leads) {
                const relevance = business_relevance_validator_1.businessRelevanceValidator.validate(lead.companyName, lead.category, businessType || keyword);
                if (!relevance.relevant || relevance.score < 25) {
                    logger_1.logger.info({
                        business: lead.companyName, reason: 'relevance_low', score: relevance.score,
                    }, 'IndiaMartSource: Rejected by relevance');
                    continue;
                }
                lead.relevanceScore = relevance.score;
                lead.validatedCategory = relevance.validatedCategory;
                if (area) {
                    const locCheck = business_relevance_validator_1.businessRelevanceValidator.validateLocation(lead.address, area, city, state);
                    if (!locCheck.relevant) {
                        logger_1.logger.info({
                            business: lead.companyName, reason: 'area_mismatch',
                        }, 'IndiaMartSource: Rejected by area');
                        continue;
                    }
                }
                lead.leadScore = this.calculateLeadScore(lead);
                validatedLeads.push(lead);
            }
            const stored = await this.storeLeads(validatedLeads, {
                keyword,
                location: area || location,
                area,
                city,
                state,
                businessType: businessType || keyword,
                fullSearchQuery: keyword,
            });
            logger_1.logger.info({
                totalExtracted: result.totalExtracted,
                totalStored: stored.totalStored,
                totalDuplicates: stored.totalDuplicates,
                validatedSaved: validatedLeads.length,
            }, 'IndiaMartSource: Delegated scrape completed');
            return {
                success: stored.totalStored > 0,
                message: stored.totalStored > 0
                    ? `IndiaMart completed: ${stored.totalStored} saved`
                    : 'No relevant businesses found on IndiaMart',
                totalExtracted: result.totalExtracted,
                totalStored: stored.totalStored,
                totalDuplicates: stored.totalDuplicates,
                leads: stored.leads,
            };
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error({ err: errMsg, keyword }, 'IndiaMartSource: Delegated scrape failed');
            return {
                success: false,
                message: `IndiaMart failed: ${errMsg}`,
                totalExtracted: 0,
                totalStored: 0,
                totalDuplicates: 0,
                leads: [],
            };
        }
    }
}
exports.IndiaMartSource = IndiaMartSource;
//# sourceMappingURL=scraper.js.map