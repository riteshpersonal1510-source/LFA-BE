"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const lead_controller_1 = require("../controllers/lead.controller");
const search_validator_1 = require("../validators/search.validator");
const validations_1 = require("../utils/validations");
const error_handler_1 = require("../utils/error-handler");
const logger_1 = require("../utils/logger");
const SearchHistory_1 = require("../models/SearchHistory");
const Lead_1 = require("../models/Lead");
const Country_1 = require("../models/Country");
const api_response_1 = require("../utils/api-response");
const search_status_service_1 = require("../services/search-status.service");
const search_queue_service_1 = require("../services/search-queue.service");
const scraper_service_1 = require("../services/scraper.service");
const search_state_machine_1 = require("../automation/search-state-machine");
const location_query_builder_1 = require("../utils/location-query-builder");
const router = (0, express_1.Router)();
async function createSearchHistoryRecord(data) {
    try {
        await SearchHistory_1.SearchHistory.create({
            searchSessionId: data.searchSessionId,
            keyword: data.keyword,
            state: data.state,
            city: data.city,
            area: data.area,
            country: data.country,
            sources: data.sources || [...scraper_service_1.DEFAULT_SEARCH_SOURCES],
            startedAt: new Date(),
            status: 'QUEUED',
            isRunning: true,
            searchState: search_state_machine_1.SearchState.QUEUED,
            currentFound: 0,
            currentSaved: 0,
            currentDuplicates: 0,
            failedCount: 0,
            progress: 0,
            currentStage: 'QUEUED',
            lastHeartbeat: new Date(),
            lastUpdateTime: new Date(),
            maxProgressReached: 0,
        });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('E11000')) {
            logger_1.logger.warn({ searchSessionId: data.searchSessionId }, '[search] SearchHistory duplicate key, skipping create');
            return;
        }
        logger_1.logger.error({ err: msg }, '[search] Failed to create SearchHistory');
        throw err;
    }
}
router.get('/session/active', (0, error_handler_1.asyncHandler)(async (_req, res) => {
    const session = await search_status_service_1.searchStatus.getActiveSession();
    if (!session) {
        return api_response_1.APIResponse.success(res, null, 'No active session');
    }
    return api_response_1.APIResponse.success(res, search_status_service_1.searchStatus.toApiResponse(session), 'Active session found');
}));
router.get('/active-session', (0, error_handler_1.asyncHandler)(async (_req, res) => {
    const session = await search_status_service_1.searchStatus.getActiveSession();
    if (!session) {
        return api_response_1.APIResponse.success(res, null, 'No active session');
    }
    return api_response_1.APIResponse.success(res, search_status_service_1.searchStatus.toApiResponse(session), 'Active session found');
}));
router.get('/history/aggregated', (0, error_handler_1.asyncHandler)(async (req, res) => {
    const page = parseInt(req.query.page?.toString() || '1', 10);
    const limit = parseInt(req.query.limit?.toString() || '20', 10);
    const skip = (page - 1) * limit;
    const total = await SearchHistory_1.SearchHistory.countDocuments();
    const records = await SearchHistory_1.SearchHistory.find()
        .sort({ startedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    const data = records.map((r, idx) => ({
        srNo: skip + idx + 1,
        searchSessionId: r.searchSessionId,
        keyword: r.keyword,
        state: r.state,
        city: r.city,
        area: r.area,
        sources: r.sources,
        totalLeads: r.totalLeads || r.currentSaved || 0,
        status: r.status,
        searchState: r.searchState,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        duration: r.duration || 0,
        progress: r.progress,
        currentFound: r.currentFound,
        currentSaved: r.currentSaved,
        currentDuplicates: r.currentDuplicates,
    }));
    return api_response_1.APIResponse.paginated(res, data, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    }, 'Search history fetched');
}));
router.get('/history/:sessionId', (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { sessionId } = req.params;
    const inMemory = await search_status_service_1.searchStatus.getProgressFromDB(sessionId);
    if (inMemory) {
        return api_response_1.APIResponse.success(res, search_status_service_1.searchStatus.toApiResponse(inMemory), 'Session found');
    }
    const record = await SearchHistory_1.SearchHistory.findOne({ searchSessionId: sessionId }).lean();
    if (!record) {
        return api_response_1.APIResponse.error(res, 'Session not found', undefined, 404);
    }
    const totalLeads = await Lead_1.Lead.countDocuments({ searchSessionId: sessionId });
    return api_response_1.APIResponse.success(res, {
        searchSessionId: record.searchSessionId,
        sessionId: record.searchSessionId,
        keyword: record.keyword,
        searchState: record.searchState || 'IDLE',
        state: record.state,
        city: record.city,
        area: record.area,
        sources: record.sources,
        status: record.status,
        totalLeads,
        totalFound: record.totalFound || record.currentFound || 0,
        uniqueSaved: record.uniqueSaved || record.currentSaved || 0,
        duplicates: record.duplicatesRemoved || record.currentDuplicates || 0,
        currentFound: record.currentFound || 0,
        currentSaved: record.currentSaved || 0,
        currentDuplicates: record.currentDuplicates || 0,
        failedCount: record.failedCount || 0,
        progress: record.progress || 0,
        currentSource: record.currentSource || '',
        currentStage: record.currentStage || '',
        currentBusiness: record.currentBusiness || '',
        currentUrl: record.currentUrl || '',
        eta: record.eta || 0,
        totalProcessed: record.totalProcessed || 0,
        estimatedTotal: record.estimatedTotal || 0,
        sourceBreakdown: record.sourceBreakdown || {},
        logs: record.logs || [],
        startedAt: record.startedAt,
        completedAt: record.completedAt,
        stoppedAt: record.stoppedAt,
        error: record.error || record.failureReason,
        isRunning: record.isRunning,
        lastHeartbeat: record.lastHeartbeat,
    }, 'Session found');
}));
router.get('/history', (0, error_handler_1.asyncHandler)(async (req, res, next) => {
    return lead_controller_1.leadController.getSearchHistory(req, res, next);
}));
router.get('/history/:sessionId/location-summary', (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { sessionId } = req.params;
    const summary = await Lead_1.Lead.aggregate([
        { $match: { searchSessionId: sessionId } },
        {
            $group: {
                _id: {
                    state: '$searchedState',
                    city: '$searchedCity',
                    area: '$searchedArea',
                },
                totalLeads: { $sum: 1 },
            },
        },
        {
            $project: {
                _id: 0,
                state: { $ifNull: ['$_id.state', 'Unknown'] },
                city: { $ifNull: ['$_id.city', 'Unknown'] },
                area: { $ifNull: ['$_id.area', 'Unknown'] },
                totalLeads: 1,
            },
        },
        { $sort: { state: 1, city: 1, area: 1 } },
    ]);
    return api_response_1.APIResponse.success(res, summary, 'Location summary fetched');
}));
router.post('/sessions/:sessionId/stop', (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { sessionId } = req.params;
    await search_queue_service_1.searchQueue.stop(sessionId);
    return api_response_1.APIResponse.success(res, { sessionId, status: 'stopped' }, 'Search stopped');
}));
router.post('/sessions/:sessionId/resume', (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { sessionId } = req.params;
    await search_queue_service_1.searchQueue.resume(sessionId);
    return api_response_1.APIResponse.success(res, { sessionId, status: 'running' }, 'Search resumed');
}));
router.delete('/history', (0, error_handler_1.asyncHandler)(async (_req, res) => {
    await SearchHistory_1.SearchHistory.deleteMany({});
    return api_response_1.APIResponse.success(res, null, 'Search history cleared');
}));
router.post('/', (0, validations_1.validate)(search_validator_1.searchRequestSchema), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const scrapeLimit = req.body.limit ?? 0;
    const maxResults = req.body.maxResults ?? 0;
    const { keyword, location, state, city, area, country, sources, businessType } = req.body;
    if (!keyword) {
        return api_response_1.APIResponse.error(res, 'Keyword is required', undefined, 400);
    }
    const sessionId = req.body.sessionId || search_status_service_1.searchStatus.generateSessionId();
    const locationString = (0, location_query_builder_1.buildLocationString)({ area, city, state, country, location });
    if (country && country.trim() && !process.env.NODE_ENV?.includes('prod')) {
        const countryRecord = await Country_1.Country.findOne({
            $or: [
                { name: { $regex: new RegExp(`^${country.trim()}$`, 'i') } },
                { slug: country.trim().toLowerCase() },
            ]
        }).lean();
        if (!countryRecord) {
            logger_1.logger.warn({ country }, `[SEARCH] Country "${country}" not in MongoDB — proceeding anyway for global support`);
        }
    }
    logger_1.logger.info({
        keyword,
        location: locationString,
        sources,
        limit: scrapeLimit,
        sessionId,
    }, '[search] Processing async request');
    const actualSources = Array.isArray(sources) && sources.length > 0 ? sources : [...scraper_service_1.DEFAULT_SEARCH_SOURCES];
    const exists = await SearchHistory_1.SearchHistory.findOne({ searchSessionId: sessionId }).lean().catch(() => null);
    if (!exists) {
        await createSearchHistoryRecord({
            searchSessionId: sessionId,
            keyword,
            state,
            city,
            area,
            country,
            sources: actualSources,
        });
    }
    search_status_service_1.searchStatus.createSession(sessionId, {
        keyword,
        location: locationString,
        state,
        city,
        area,
        country,
        sources: actualSources,
    });
    search_status_service_1.searchStatus.addLog(sessionId, `Search queued for "${keyword}" in ${locationString || 'selected location'}`, 'info');
    await search_queue_service_1.searchQueue.enqueue(sessionId, {
        keyword,
        location: locationString,
        sources: actualSources,
        limit: scrapeLimit,
        state,
        city,
        area,
        country,
        businessType: businessType || keyword,
        sessionId,
        semanticExpansion: req.body.semanticExpansion !== false,
        maxResults: maxResults || undefined,
    });
    return api_response_1.APIResponse.success(res, {
        sessionId,
        searchSessionId: sessionId,
        status: 'QUEUED',
        searchState: search_state_machine_1.SearchState.QUEUED,
        keyword,
        location: locationString,
        state,
        city,
        area,
        country,
        sources: actualSources,
    }, 'Search started', 202);
}));
exports.default = router;
//# sourceMappingURL=search.route.js.map