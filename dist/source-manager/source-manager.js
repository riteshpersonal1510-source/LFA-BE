"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sourceManager = exports.SourceManager = void 0;
const logger_1 = require("../utils/logger");
const scraper_1 = require("../sources/google-maps/scraper");
const scraper_2 = require("../sources/justdial/scraper");
const scraper_3 = require("../sources/indiamart/scraper");
const scraper_4 = require("../sources/clutch/scraper");
const scraper_5 = require("../sources/official-website/scraper");
const scraping_progress_1 = require("../services/scraping-progress");
const search_query_builder_1 = require("../services/search-query-builder");
const business_relevance_validator_1 = require("../services/business-relevance-validator");
const semantic_search_service_1 = require("../services/semantic-search.service");
const search_query_scheduler_service_1 = require("../services/search-query-scheduler.service");
class SourceManager {
    constructor() {
        this.sources = new Map();
        this.allLeads = [];
        this.errors = [];
        this.activeSearch = false;
        this.registerSource(new scraper_1.GoogleMapsSource());
        this.registerSource(new scraper_2.JustdialSource());
        this.registerSource(new scraper_3.IndiaMartSource());
        this.registerSource(new scraper_4.ClutchSource());
        this.registerSource(new scraper_5.OfficialWebsiteSource());
    }
    isSearchActive() {
        return this.activeSearch;
    }
    registerSource(source) {
        this.sources.set(source.getName(), source);
        logger_1.logger.info(`SourceManager: Registered source: ${source.getName()}`);
    }
    unregisterSource(sourceName) {
        return this.sources.delete(sourceName);
    }
    getSource(sourceName) {
        return this.sources.get(sourceName);
    }
    getAllSources() {
        return Array.from(this.sources.values());
    }
    async scrapeMultiSource(request) {
        const { keyword, location, sources, limit, state, city, area, businessType, sessionId } = request;
        this.allLeads = [];
        this.errors = [];
        this.activeSearch = true;
        const sourceQueries = search_query_builder_1.searchQueryBuilder.build({
            businessType: businessType || keyword,
            state,
            city,
            area,
            sources,
        });
        logger_1.logger.info({
            action: 'multi_source_started',
            keyword, area, city, state,
            sources: sources.join(', '),
            queries: sourceQueries.map(q => ({ source: q.source, url: q.url })),
        }, 'SourceManager: Starting multi-source search');
        const results = {};
        let totalExtracted = 0;
        let totalStored = 0;
        let totalDuplicates = 0;
        const limitPerSource = Math.max(1, Math.floor(limit / sources.length));
        const scrapeTasks = sources.map((sourceName) => search_query_scheduler_service_1.searchQueryScheduler.submit({
            id: `source_${sourceName}_${Date.now()}`,
            label: `${sourceName}:${keyword}`,
            timeoutMs: 60000,
            maxRetries: 1,
            retryCount: 0,
            execute: async () => {
                const source = this.sources.get(sourceName);
                if (!source) {
                    logger_1.logger.warn(`SourceManager: Source not found: ${sourceName}`);
                    results[sourceName] = {
                        success: false,
                        message: `Source not found: ${sourceName}`,
                        totalExtracted: 0,
                        totalStored: 0,
                        totalDuplicates: 0,
                        leads: [],
                    };
                    return;
                }
                try {
                    const options = {
                        keyword,
                        location: location || '',
                        limit: limitPerSource,
                        state,
                        city,
                        area,
                        businessType: businessType || keyword,
                        sessionId,
                    };
                    logger_1.logger.info({
                        action: 'source_scrape_started',
                        source: sourceName,
                        keyword, area, city, state,
                    }, 'SourceManager: Running source');
                    const result = await source.scrape(options);
                    results[sourceName] = result;
                    if (result.leads && result.leads.length > 0) {
                        this.allLeads = [...this.allLeads, ...result.leads];
                    }
                    totalExtracted += result.totalExtracted;
                    totalStored += result.totalStored;
                    totalDuplicates += result.totalDuplicates;
                    logger_1.logger.info({
                        action: 'source_scrape_completed',
                        source: sourceName,
                        totalStored: result.totalStored,
                        totalExtracted: result.totalExtracted,
                        totalDuplicates: result.totalDuplicates,
                    }, 'SourceManager: Source completed');
                }
                catch (error) {
                    const message = error instanceof Error ? error.message : 'Scraping failed';
                    const progress = sessionId ? scraping_progress_1.scrapingProgress.getProgress(sessionId) : null;
                    const partialStored = progress?.totalSaved || 0;
                    logger_1.logger.error({
                        action: 'source_scrape_failed',
                        err: message, sourceName, partialStored, sessionId,
                    }, 'SourceManager: Source failed');
                    this.errors.push({
                        source: sourceName,
                        keyword,
                        error: message,
                        retryable: true,
                    });
                    results[sourceName] = {
                        success: partialStored > 0,
                        message: partialStored > 0
                            ? `${sourceName} completed with warnings: ${message}`
                            : message,
                        totalExtracted: progress?.totalFound || 0,
                        totalStored: partialStored,
                        totalDuplicates: 0,
                        leads: [],
                    };
                }
            },
        }));
        await Promise.allSettled(scrapeTasks);
        this.allLeads = this.allLeads.map(lead => {
            const validation = business_relevance_validator_1.businessRelevanceValidator.validateWithAI(lead.companyName, lead.category, request.businessType || request.keyword, lead.address, lead.website, lead.phone, lead.email, lead.rating, lead.source, request.area, request.city, request.state);
            return {
                ...lead,
                relevanceScore: validation.relevanceScore,
                validatedCategory: validation.validatedCategory,
                locationConfidence: validation.locationConfidence,
                categoryConfidence: validation.categoryConfidence,
                finalConfidence: validation.finalConfidence,
                validationStatus: validation.validationStatus,
                rejectionReason: validation.rejectionReason,
                aiMatchType: validation.matchType,
                aiWarnings: validation.warnings,
                aiQuality: validation.quality,
                sources: lead.sources || [lead.source],
            };
        });
        const success = Object.values(results).some((r) => r.success);
        const partialSuccess = success && this.errors.length > 0;
        const message = success
            ? partialSuccess
                ? 'Scraping completed with some errors'
                : 'Scraping completed'
            : totalExtracted > 0
                ? `Found ${totalExtracted} leads but could not store them`
                : 'No leads found from any source';
        this.activeSearch = false;
        logger_1.logger.info({
            action: 'multi_source_completed',
            totalStored, totalDuplicates, totalExtracted,
            sources: sources.join(', '),
            keyword, area, city, state,
            errors: this.errors.length,
        }, 'SourceManager: Multi-source search completed');
        return {
            success: success || totalExtracted > 0,
            message,
            results,
            totalExtracted,
            totalStored,
            totalDuplicates,
            leads: this.allLeads,
            sourceQueries,
            partialSuccess: partialSuccess || undefined,
            errors: this.errors.length > 0 ? this.errors : undefined,
        };
    }
    async scrapeMultiSourceSemantic(request) {
        const { keyword, location: reqLocation, sources, limit, state, city, area, businessType, sessionId } = request;
        this.allLeads = [];
        this.errors = [];
        this.activeSearch = true;
        const sourceValidation = semantic_search_service_1.semanticSearchService.validateSources(sources);
        if (sourceValidation) {
            this.activeSearch = false;
            return {
                success: false,
                message: sourceValidation,
                results: {},
                totalExtracted: 0,
                totalStored: 0,
                totalDuplicates: 0,
                leads: [],
                sourceQueries: [],
            };
        }
        const expansionResult = semantic_search_service_1.semanticSearchService.expandWithAIFallback(businessType || keyword, sources, state, city, area);
        if (expansionResult.validationError) {
            this.activeSearch = false;
            return {
                success: false,
                message: expansionResult.validationError,
                results: {},
                totalExtracted: 0,
                totalStored: 0,
                totalDuplicates: 0,
                leads: [],
                sourceQueries: [],
            };
        }
        const topKeywords = expansionResult.queries.slice(0, 8);
        logger_1.logger.info({
            action: 'semantic_search_started',
            originalKeyword: keyword,
            expandedKeywords: topKeywords.map(q => q.keyword),
            totalExpanded: expansionResult.queries.length,
            matchedCategory: expansionResult.matchedCategory,
            sources: sources.join(', '),
        }, 'SourceManager: Starting semantic multi-source search');
        if (sessionId) {
            const totalQueryCount = topKeywords.length * sources.length;
            scraping_progress_1.scrapingProgress.createSemanticSession(sessionId, {
                keyword,
                location: reqLocation || '',
                area: area || '',
                city: city || '',
                state: state || '',
                businessType: businessType || keyword,
            }, totalQueryCount);
        }
        const allSourceQueries = [];
        for (const sq of topKeywords) {
            const queries = search_query_builder_1.searchQueryBuilder.build({
                businessType: sq.keyword,
                state,
                city,
                area,
                sources,
            });
            for (const q of queries) {
                allSourceQueries.push({
                    ...q,
                    semanticKeyword: sq.keyword,
                    categoryGroup: sq.categoryGroupName,
                    priority: sq.priority,
                    isSemanticExpansion: !sq.isPrimary,
                });
            }
        }
        const results = {};
        let totalExtracted = 0;
        let totalStored = 0;
        let totalDuplicates = 0;
        const limitPerQuery = Math.max(1, Math.floor(limit / Math.max(allSourceQueries.length, 1)));
        const scrapeTasks = allSourceQueries.map((sourceQuery, queryIndex) => search_query_scheduler_service_1.searchQueryScheduler.submit({
            id: `semantic_${sourceQuery.source}_${sourceQuery.semanticKeyword || keyword}_${Date.now()}`,
            label: `${sourceQuery.source}:${sourceQuery.semanticKeyword || keyword}`,
            timeoutMs: 60000,
            maxRetries: 1,
            retryCount: 0,
            execute: async () => {
                const source = this.sources.get(sourceQuery.source);
                if (!source) {
                    if (sessionId) {
                        scraping_progress_1.scrapingProgress.setSemanticQuerySkipped(sessionId, queryIndex, `Source not found: ${sourceQuery.source}`);
                    }
                    return;
                }
                if (sessionId) {
                    scraping_progress_1.scrapingProgress.updateSemanticQueryProgress(sessionId, queryIndex, {
                        keyword: sourceQuery.semanticKeyword || keyword,
                        source: sourceQuery.source,
                        status: 'running',
                        startedAt: new Date().toISOString(),
                    });
                }
                try {
                    const options = {
                        keyword: sourceQuery.semanticKeyword || keyword,
                        location: reqLocation || '',
                        limit: limitPerQuery,
                        state,
                        city,
                        area,
                        businessType: sourceQuery.semanticKeyword || businessType || keyword,
                        sessionId,
                    };
                    logger_1.logger.info({
                        action: 'semantic_source_scrape',
                        source: sourceQuery.source,
                        keyword: sourceQuery.semanticKeyword,
                        query: sourceQuery.fullSearchQuery || sourceQuery.query,
                        url: sourceQuery.url,
                    }, 'SourceManager: Running semantic source query');
                    const result = await source.scrape(options);
                    if (result.leads && result.leads.length > 0) {
                        const leadsWithMeta = result.leads.map(lead => ({
                            ...lead,
                            semanticCategory: sourceQuery.categoryGroup || expansionResult.matchedCategory?.id || '',
                            semanticCategoryName: sourceQuery.categoryGroup || expansionResult.matchedCategory?.name || '',
                            matchedKeyword: sourceQuery.semanticKeyword || keyword,
                            originalSearchedKeyword: keyword,
                            searchGroup: sourceQuery.categoryGroup || '',
                            semanticMatchReason: sourceQuery.isSemanticExpansion
                                ? `Matched via semantic expansion: "${sourceQuery.semanticKeyword}" belongs to "${sourceQuery.categoryGroup}" category (original search: "${keyword}")`
                                : `Primary match for keyword: "${keyword}"`,
                            expandedFromKeyword: sourceQuery.isSemanticExpansion ? keyword : undefined,
                        }));
                        this.allLeads = [...this.allLeads, ...leadsWithMeta];
                        if (!results[sourceQuery.source]) {
                            results[sourceQuery.source] = {
                                success: false,
                                message: '',
                                totalExtracted: 0,
                                totalStored: 0,
                                totalDuplicates: 0,
                                leads: [],
                            };
                        }
                        results[sourceQuery.source].success = true;
                        results[sourceQuery.source].totalExtracted += result.totalExtracted;
                        results[sourceQuery.source].totalStored += result.totalStored;
                        results[sourceQuery.source].totalDuplicates += result.totalDuplicates;
                    }
                    totalExtracted += result.totalExtracted;
                    totalStored += result.totalStored;
                    totalDuplicates += result.totalDuplicates;
                    if (sessionId) {
                        scraping_progress_1.scrapingProgress.setSemanticQueryCompleted(sessionId, queryIndex);
                    }
                    logger_1.logger.info({
                        action: 'semantic_source_query_completed',
                        source: sourceQuery.source,
                        keyword: sourceQuery.semanticKeyword,
                        totalStored: result.totalStored,
                        totalExtracted: result.totalExtracted,
                    }, 'SourceManager: Semantic source query completed');
                }
                catch (error) {
                    const message = error instanceof Error ? error.message : 'Scraping failed';
                    logger_1.logger.error({
                        action: 'semantic_source_query_failed',
                        err: message,
                        source: sourceQuery.source,
                        keyword: sourceQuery.semanticKeyword,
                    }, 'SourceManager: Semantic source query failed');
                    this.errors.push({
                        source: sourceQuery.source,
                        keyword: sourceQuery.semanticKeyword || keyword,
                        error: message,
                        retryable: !message.toLowerCase().includes('invalid'),
                    });
                    if (sessionId) {
                        scraping_progress_1.scrapingProgress.setSemanticQueryFailed(sessionId, queryIndex, message);
                    }
                }
            },
        }));
        await Promise.allSettled(scrapeTasks);
        this.allLeads = this.allLeads.map(lead => {
            const validation = business_relevance_validator_1.businessRelevanceValidator.validateWithAI(lead.companyName, lead.category, request.businessType || request.keyword, lead.address, lead.website, lead.phone, lead.email, lead.rating, lead.source, request.area, request.city, request.state);
            return {
                ...lead,
                relevanceScore: validation.relevanceScore,
                validatedCategory: validation.validatedCategory,
                locationConfidence: validation.locationConfidence,
                categoryConfidence: validation.categoryConfidence,
                finalConfidence: validation.finalConfidence,
                validationStatus: validation.validationStatus,
                rejectionReason: validation.rejectionReason,
                aiMatchType: validation.matchType,
                aiWarnings: validation.warnings,
                aiQuality: validation.quality,
                sources: lead.sources || [lead.source],
            };
        });
        const success = Object.values(results).some((r) => r.success);
        const partialSuccess = success && this.errors.length > 0;
        if (partialSuccess && sessionId) {
            scraping_progress_1.scrapingProgress.markPartialSuccess(sessionId);
        }
        const message = success
            ? partialSuccess
                ? `Semantic search completed with some errors: ${expansionResult.queries.length} variants expanded from "${keyword}"`
                : `Semantic search completed: ${expansionResult.queries.length} variants expanded from "${keyword}"`
            : totalExtracted > 0
                ? `Found ${totalExtracted} leads but could not store them`
                : 'No leads found from any semantic variant';
        this.activeSearch = false;
        if (sessionId) {
            if (this.errors.length > 0) {
                scraping_progress_1.scrapingProgress.failSession(sessionId, `${this.errors.length} semantic queries failed`);
            }
            else {
                scraping_progress_1.scrapingProgress.completeSession(sessionId);
            }
        }
        logger_1.logger.info({
            action: 'semantic_search_completed',
            originalKeyword: keyword,
            expandedKeywordsCount: topKeywords.length,
            totalStored, totalDuplicates, totalExtracted,
            matchedCategory: expansionResult.matchedCategory,
            errors: this.errors.length,
        }, 'SourceManager: Semantic search completed');
        return {
            success: success || totalExtracted > 0,
            message,
            results,
            totalExtracted,
            totalStored,
            totalDuplicates,
            leads: this.allLeads,
            sourceQueries: allSourceQueries,
            partialSuccess: partialSuccess || undefined,
            errors: this.errors.length > 0 ? this.errors : undefined,
        };
    }
    getAllLeads() {
        return this.allLeads;
    }
    getSourcesStatus() {
        return Array.from(this.sources.values()).map((source) => ({
            name: source.getName(),
            enabled: true,
            status: 'active',
        }));
    }
    enableSource(sourceName) {
        const source = this.sources.get(sourceName);
        if (source) {
            logger_1.logger.info(`SourceManager: Enabled source: ${sourceName}`);
            return true;
        }
        return false;
    }
    disableSource(sourceName) {
        const source = this.sources.get(sourceName);
        if (source) {
            logger_1.logger.info(`SourceManager: Disabled source: ${sourceName}`);
            return true;
        }
        return false;
    }
    clearSearchState() {
        this.activeSearch = false;
        this.allLeads = [];
        this.errors = [];
    }
}
exports.SourceManager = SourceManager;
exports.sourceManager = new SourceManager();
//# sourceMappingURL=source-manager.js.map