"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scraperService = exports.ScraperService = exports.DEFAULT_SEARCH_SOURCES = void 0;
const logger_1 = require("../utils/logger");
const location_query_builder_1 = require("../utils/location-query-builder");
const multi_source_1 = require("../multi-source");
const python_scraper_service_1 = require("./python-scraper.service");
exports.DEFAULT_SEARCH_SOURCES = [
    'google-maps',
    'justdial',
    'indiamart',
    'clutch',
    'website',
];
class ScraperService {
    async scrapeBusinesses(options) {
        const { keyword, location, sources = [], limit = 0, state, city, area, country, businessType, sessionId = `node_${Date.now()}`, isCancelled, maxResults, resumeSessionId, } = options;
        if (isCancelled?.()) {
            return this._cancelled();
        }
        const resolvedSources = (0, multi_source_1.validateSources)(sources.length > 0 ? sources : (0, multi_source_1.getSourcesForCountry)(country), country);
        const { searchQuery } = (0, location_query_builder_1.buildMapsSearchQuery)(businessType || keyword, {
            area,
            city,
            state,
            country,
            location,
        });
        logger_1.logger.info({
            action: 'scrape_started',
            keyword,
            area,
            city,
            state,
            country,
            sources: resolvedSources,
            limit,
            sessionId,
            searchQuery,
            engine: 'python',
            countryRouting: (0, multi_source_1.isIndiaCountry)(country) ? 'india' : 'international',
        }, `[SCRAPER_SERVICE] Delegating "${keyword}" in ${[area, city, state, country].filter(Boolean).join(', ') || location || 'unspecified'} → Python`);
        let result;
        try {
            result = await python_scraper_service_1.pythonScraperService.scrape({
                keyword,
                location: location || searchQuery,
                state,
                city,
                area,
                country,
                sources: resolvedSources,
                limit,
                businessType: businessType || keyword,
                sessionId,
                maxResults: maxResults ?? (limit > 0 ? limit : undefined),
                resumeSessionId,
            }, sessionId);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            logger_1.logger.error({ err: msg, keyword, sessionId }, '[SCRAPER_SERVICE] pythonScraperService threw');
            return {
                success: false,
                message: `Scraper error: ${msg}`,
                results: {},
                totalExtracted: 0,
                totalStored: 0,
                totalDuplicates: 0,
                leads: [],
                errors: [{ source: 'python-scraper', keyword, error: msg }],
            };
        }
        const resultsMap = {};
        for (const sr of result.sourceResults ?? []) {
            resultsMap[sr.source] = {
                totalExtracted: sr.totalExtracted,
                totalStored: sr.totalStored,
                totalDuplicates: sr.totalDuplicates,
            };
        }
        logger_1.logger.info({
            action: 'scrape_completed',
            totalExtracted: result.totalExtracted,
            totalStored: result.totalStored,
            totalDuplicates: result.totalDuplicates,
            sources: resolvedSources,
            keyword,
            area,
            city,
            state,
            country,
            success: result.success,
            errorCount: result.errors?.length ?? 0,
            engine: 'python',
        }, `[SCRAPER_SERVICE] Done: ${result.message}`);
        return {
            success: result.success,
            message: result.message,
            results: resultsMap,
            totalExtracted: result.totalExtracted,
            totalStored: result.totalStored,
            totalDuplicates: result.totalDuplicates,
            leads: result.leads,
            errors: result.errors?.map((e) => ({
                source: e.source,
                keyword,
                error: e.error,
            })),
        };
    }
    _cancelled() {
        return {
            success: false,
            message: 'Scrape cancelled',
            results: {},
            totalExtracted: 0,
            totalStored: 0,
            totalDuplicates: 0,
            leads: [],
        };
    }
}
exports.ScraperService = ScraperService;
exports.scraperService = new ScraperService();
//# sourceMappingURL=scraper.service.js.map