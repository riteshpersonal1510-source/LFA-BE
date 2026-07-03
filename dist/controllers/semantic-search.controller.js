"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.semanticSearchController = exports.SemanticSearchController = void 0;
const semantic_search_service_1 = require("../services/semantic-search.service");
const businessCategoryEngine_1 = require("../modules/search/businessCategoryEngine");
const search_coverage_service_1 = require("../services/search-coverage.service");
const source_manager_1 = require("../source-manager/source-manager");
const search_query_scheduler_service_1 = require("../services/search-query-scheduler.service");
const browser_pool_service_1 = require("../services/browser-pool.service");
const logger_1 = require("../utils/logger");
const activeSearches = new Map();
function generateSearchGuardId(req) {
    const userId = req.user?.id || 'anonymous';
    const keyword = req.body?.keyword || 'unknown';
    return `search_${userId}_${keyword}`;
}
function acquireSearchGuard(req) {
    const guardId = generateSearchGuardId(req);
    const existing = activeSearches.get(guardId);
    if (existing && (Date.now() - existing.startedAt) < 300000) {
        return { acquired: false, existing, guardId };
    }
    if (existing) {
        activeSearches.delete(guardId);
    }
    activeSearches.set(guardId, {
        sessionId: req.body?.sessionId || 'unknown',
        startedAt: Date.now(),
        keyword: req.body?.keyword || 'unknown',
    });
    return { acquired: true, guardId };
}
function releaseSearchGuard(guardId) {
    activeSearches.delete(guardId);
}
async function safeExecute(fn, options) {
    try {
        const data = await fn();
        return { data, error: null };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        const stack = error instanceof Error ? error.stack : undefined;
        logger_1.logger.error({
            err: message,
            stack,
            errorCode: options.errorCode,
            ...options.logContext,
        }, `[SemanticSearch] ${options.errorCode}`);
        const isRetryable = !message.toLowerCase().includes('invalid')
            && !message.toLowerCase().includes('not found')
            && !message.toLowerCase().includes('validation');
        return {
            data: null,
            error: {
                errorCode: options.errorCode,
                message,
                retryable: isRetryable,
            },
        };
    }
}
class SemanticSearchController {
    async expandKeywords(req, res) {
        const { acquired, guardId } = acquireSearchGuard(req);
        if (!acquired) {
            res.status(429).json({
                success: false,
                message: 'A search is already in progress for this keyword. Please wait for it to complete.',
                retryable: true,
            });
            return;
        }
        try {
            const keyword = req.body.keyword;
            const sources = req.body.sources || ['google-maps'];
            const state = req.body.state;
            const city = req.body.city;
            const area = req.body.area;
            const inputValidation = semantic_search_service_1.semanticSearchService.validateInput(keyword);
            if (inputValidation) {
                res.status(400).json({
                    success: false,
                    message: inputValidation,
                    errorCode: 'INVALID_KEYWORD',
                });
                return;
            }
            const sourceValidation = semantic_search_service_1.semanticSearchService.validateSources(sources);
            if (sourceValidation) {
                res.status(400).json({
                    success: false,
                    message: sourceValidation,
                    errorCode: 'INVALID_SOURCES',
                });
                return;
            }
            const result = semantic_search_service_1.semanticSearchService.expandWithAIFallback(keyword, sources, state, city, area);
            if (result.validationError) {
                res.status(400).json({
                    success: false,
                    message: result.validationError,
                    errorCode: 'EXPANSION_FAILED',
                });
                return;
            }
            const preview = {
                originalKeyword: keyword,
                matchedCategory: result.matchedCategory,
                expandedKeywords: result.expandedKeywords.map(ek => ({
                    keyword: ek.keyword,
                    isPrimary: ek.isPrimary,
                    priority: ek.priority,
                    categoryGroup: ek.categoryGroupName,
                })),
                keywordsPreview: result.expandedKeywords.slice(0, 5).map(ek => ek.keyword),
                totalExpandedKeywords: result.expandedKeywords.length,
                totalQueries: result.queries.length,
                coverage: result.coverage,
            };
            res.status(200).json({
                success: true,
                data: preview,
            });
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error({ err: errMsg }, '[SemanticSearch] Error expanding keywords');
            res.status(500).json({
                success: false,
                message: 'An unexpected error occurred while expanding keywords',
                errorCode: 'INTERNAL_ERROR',
                retryable: true,
            });
        }
        finally {
            releaseSearchGuard(guardId);
        }
    }
    async getCategoryGroups(_req, res) {
        const result = await safeExecute(async () => businessCategoryEngine_1.businessCategoryEngine.getAllCategoryGroups(), { errorCode: 'CATEGORY_GROUPS_FAILED' });
        if (result.error) {
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve category groups',
                errorCode: result.error.errorCode,
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: result.data,
        });
    }
    async getSearchCoverageAnalytics(_req, res) {
        const result = await safeExecute(async () => search_coverage_service_1.searchCoverageService.getAggregateStats(), { errorCode: 'COVERAGE_ANALYTICS_FAILED' });
        if (result.error) {
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve search coverage analytics',
                errorCode: result.error.errorCode,
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: result.data,
        });
    }
    getSessionCoverage(req, res) {
        try {
            const sessionId = req.params.sessionId;
            const session = search_coverage_service_1.searchCoverageService.getSession(sessionId);
            if (!session) {
                res.status(404).json({
                    success: false,
                    message: 'Session not found',
                    errorCode: 'SESSION_NOT_FOUND',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: session,
            });
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error({ err: errMsg, sessionId: req.params.sessionId }, '[SemanticSearch] Error getting session');
            res.status(500).json({
                success: false,
                message: 'An unexpected error occurred while retrieving the session',
                errorCode: 'INTERNAL_ERROR',
            });
        }
    }
    getSearchStatus(_req, res) {
        const schedulerStatus = search_query_scheduler_service_1.searchQueryScheduler.getStatus();
        const browserPoolStatus = browser_pool_service_1.browserPool.getStatus();
        const isActive = source_manager_1.sourceManager.isSearchActive();
        res.status(200).json({
            success: true,
            data: {
                activeSearch: isActive,
                scheduler: schedulerStatus,
                browserPool: browserPoolStatus,
                activeSearchGuardCount: activeSearches.size,
            },
        });
    }
}
exports.SemanticSearchController = SemanticSearchController;
exports.semanticSearchController = new SemanticSearchController();
//# sourceMappingURL=semantic-search.controller.js.map