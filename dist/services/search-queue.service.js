"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchCleanup = exports.searchQueue = void 0;
const scraper_service_1 = require("./scraper.service");
const search_status_service_1 = require("./search-status.service");
const browser_pool_service_1 = require("./browser-pool.service");
const browser_manager_1 = require("../core/scraper-engine/browser-manager");
const lead_storage_1 = require("../core/scraper-engine/lead-storage");
const SearchHistory_1 = require("../models/SearchHistory");
const SearchAnalytics_1 = require("../models/SearchAnalytics");
const Lead_1 = require("../models/Lead");
const logger_1 = require("../utils/logger");
const search_state_machine_1 = require("../automation/search-state-machine");
const location_query_builder_1 = require("../utils/location-query-builder");
const recovery_1 = require("../recovery");
const socket_manager_1 = require("../modules/automation-monitor/socket-manager");
const TABLE_FLIP = '(╯°□°)╯︵ ┻━┻';
function emitSearchHistoryUpdatePartial(sessionId, session, savedCount, errorMsg) {
    const durationMs = Date.now() - new Date(session.startedAt).getTime();
    (0, socket_manager_1.emitSearchHistoryUpdate)(sessionId, {
        keyword: session.keyword,
        state: session.state,
        city: session.city,
        area: session.area,
        country: session.country,
        sources: session.sources,
        totalLeads: savedCount,
        businessesFound: session.leadsFound,
        businessesSaved: savedCount,
        duplicates: session.duplicatesRemoved,
        progress: session.progressPercentage,
        maxProgressReached: session.progressPercentage,
        startedAt: session.startedAt,
        completedAt: new Date().toISOString(),
        duration: Math.round(durationMs / 1000),
        status: 'PARTIAL_SUCCESS',
        failureReason: errorMsg,
        failureClassification: 'BACKEND_CRASH',
        searchSessionId: sessionId,
    });
}
class SearchQueueService {
    constructor() {
        this.scraperService = new scraper_service_1.ScraperService();
        this.activeSessions = new Set();
        this.stopRequested = new Map();
        this.queue = [];
        this.sessionLocks = new Set();
        this.abortControllers = new Map();
    }
    isRunning(sessionId) {
        return this.activeSessions.has(sessionId);
    }
    isStopRequested(sessionId) {
        return this.stopRequested.get(sessionId) === true;
    }
    async enqueue(sessionId, options) {
        if (!this.activeSessions.has(sessionId)) {
            this.stopRequested.set(sessionId, false);
        }
        const queueDepth = this.queue.length;
        logger_1.logger.info({
            sessionId,
            keyword: options.keyword,
            location: options.location,
            sources: options.sources,
            queueDepth,
        }, `[SEARCH_CREATED] Search created and enqueued for "${options.keyword}"`);
        search_status_service_1.searchStatus.setState(sessionId, search_state_machine_1.SearchState.QUEUED);
        search_status_service_1.searchStatus.addLog(sessionId, 'Search queued', 'info');
        this.queue.push({ sessionId, options });
        this.processNext();
    }
    async stop(sessionId) {
        logger_1.logger.info({ sessionId }, `[SEARCH_QUEUE] Stopping search ${sessionId}`);
        this.stopRequested.set(sessionId, true);
        const controller = this.abortControllers.get(sessionId);
        if (controller) {
            controller.abort();
            this.abortControllers.delete(sessionId);
        }
        await search_status_service_1.searchStatus.markStopped(sessionId);
        this.activeSessions.delete(sessionId);
        this.queue = this.queue.filter(j => j.sessionId !== sessionId);
        logger_1.logger.info({ sessionId }, `[SEARCH_QUEUE] Search ${sessionId} stopped`);
    }
    async resume(sessionId) {
        const record = await SearchHistory_1.SearchHistory.findOne({ searchSessionId: sessionId }).lean();
        if (!record) {
            logger_1.logger.error({ sessionId }, `[SEARCH_QUEUE] ${TABLE_FLIP} Cannot resume - session not found`);
            return;
        }
        if (record.status !== 'STOPPED') {
            logger_1.logger.warn({ sessionId, status: record.status }, `[SEARCH_QUEUE] Cannot resume - not in stopped state`);
            return;
        }
        logger_1.logger.info({ sessionId }, `[SEARCH_QUEUE] Resuming search ${sessionId}`);
        this.stopRequested.set(sessionId, false);
        await SearchHistory_1.SearchHistory.updateOne({ searchSessionId: sessionId }, { $set: { status: 'running', isRunning: true, stoppedAt: null, searchState: search_state_machine_1.SearchState.QUEUED } });
        const locationString = (0, location_query_builder_1.buildLocationString)({
            area: record.area,
            city: record.city,
            state: record.state,
            country: record.country,
        });
        const resumeSources = Array.isArray(record.sources) && record.sources.length > 0
            ? record.sources
            : [...scraper_service_1.DEFAULT_SEARCH_SOURCES];
        search_status_service_1.searchStatus.restoreFromDB(record);
        search_status_service_1.searchStatus.setState(sessionId, search_state_machine_1.SearchState.QUEUED);
        search_status_service_1.searchStatus.addLog(sessionId, 'Search resumed', 'info');
        await this.enqueue(sessionId, {
            keyword: record.keyword,
            location: locationString,
            sources: resumeSources,
            limit: 0,
            state: record.state,
            city: record.city,
            area: record.area,
            country: record.country,
            businessType: record.keyword,
            sessionId,
        });
    }
    async processNext() {
        while (this.queue.length > 0) {
            const job = this.queue.shift();
            if (!job)
                break;
            if (this.isStopRequested(job.sessionId)) {
                search_status_service_1.searchStatus.addLog(job.sessionId, 'Search was stopped while queued', 'warn');
                continue;
            }
            if (this.sessionLocks.has(job.sessionId)) {
                search_status_service_1.searchStatus.addLog(job.sessionId, 'Search already running, skipping', 'warn');
                continue;
            }
            this.executeJob(job).catch(err => {
                logger_1.logger.error({ sessionId: job.sessionId, err }, '[SEARCH_QUEUE] executeJob threw');
            });
        }
    }
    async executeJob(job) {
        const { sessionId, options } = job;
        if (this.activeSessions.has(sessionId))
            return;
        if (this.sessionLocks.has(sessionId)) {
            logger_1.logger.warn({ sessionId }, `[SEARCH_QUEUE] Session already locked, skipping`);
            return;
        }
        this.sessionLocks.add(sessionId);
        const jobStartTime = Date.now();
        try {
            this.activeSessions.add(sessionId);
            this.stopRequested.set(sessionId, false);
            const abortController = new AbortController();
            this.abortControllers.set(sessionId, abortController);
            logger_1.logger.info({ sessionId, keyword: options.keyword }, `[SEARCH_QUEUE] [WORKER_STARTED] executeJob for "${options.keyword}"`);
            search_status_service_1.searchStatus.setState(sessionId, search_state_machine_1.SearchState.STARTING_BROWSER);
            search_status_service_1.searchStatus.addLog(sessionId, '[PLAYWRIGHT_START] Starting browser...', 'info');
            (0, recovery_1.createPipeline)(sessionId, options.keyword);
            (0, recovery_1.startStage)(sessionId, recovery_1.PipelineStage.EXTRACTION);
            if (this.isStopRequested(sessionId))
                return;
            search_status_service_1.searchStatus.setState(sessionId, search_state_machine_1.SearchState.BROWSER_READY);
            search_status_service_1.searchStatus.addLog(sessionId, '[BROWSER_LAUNCHED] Browser ready', 'info');
            if (this.isStopRequested(sessionId))
                return;
            search_status_service_1.searchStatus.setState(sessionId, search_state_machine_1.SearchState.SEARCHING_GOOGLE_MAPS);
            search_status_service_1.searchStatus.addLog(sessionId, '[GOOGLE_MAPS_OPENED] Searching Google Maps...', 'info');
            const optionsWithCancel = {
                ...options,
                skipSearchTracking: true,
                isCancelled: () => this.isStopRequested(sessionId) || abortController.signal.aborted,
            };
            logger_1.logger.info({ sessionId }, `[SEARCH_QUEUE] Calling scraperService.scrapeBusinesses()`);
            const result = await this.scraperService.scrapeBusinesses(optionsWithCancel);
            const elapsed = Date.now() - jobStartTime;
            logger_1.logger.info({
                sessionId,
                elapsed,
                success: result.success,
                stored: result.totalStored,
                extracted: result.totalExtracted,
                message: result.message,
                errors: result.errors?.length || 0,
            }, `[SEARCH_QUEUE] scrapeBusinesses returned after ${elapsed}ms: "${result.message}"`);
            if (result.errors && result.errors.length > 0) {
                for (const err of result.errors) {
                    logger_1.logger.error({ source: err.source, error: err.error }, `[SEARCH_QUEUE] Source error: [${err.source}] ${err.error}`);
                    search_status_service_1.searchStatus.addLog(sessionId, `[${err.source}] ${err.error}`, 'error');
                }
            }
            if (this.isStopRequested(sessionId))
                return;
            search_status_service_1.searchStatus.setState(sessionId, search_state_machine_1.SearchState.SCRAPING_RESULTS);
            search_status_service_1.searchStatus.addLog(sessionId, `[RESULTS_FOUND] Scraping complete. ${result.totalExtracted} found, ${result.totalStored} saved`, 'info');
            (0, recovery_1.completeStage)(sessionId, recovery_1.PipelineStage.EXTRACTION);
            (0, recovery_1.startStage)(sessionId, recovery_1.PipelineStage.MONGODB);
            if (this.isStopRequested(sessionId))
                return;
            search_status_service_1.searchStatus.setState(sessionId, search_state_machine_1.SearchState.PROCESSING_RESULTS);
            search_status_service_1.searchStatus.addLog(sessionId, `Found: ${result.totalExtracted}, Saved: ${result.totalStored}, Duplicates: ${result.totalDuplicates}`, 'info');
            if (!result.success && result.totalStored === 0) {
                const failureMessage = result.errors && result.errors.length > 0
                    ? result.errors.map(e => `[${e.source}] ${e.error}`).join('; ')
                    : result.message || 'Scraping returned no results';
                const isNoResults = result.errors && result.errors.some(e => e.error?.includes('NO_RESULTS')) || failureMessage.includes('No results found');
                if (isNoResults) {
                    logger_1.logger.info({ sessionId, message: failureMessage }, `[SEARCH_QUEUE] No results found`);
                    search_status_service_1.searchStatus.addLog(sessionId, `[NO_RESULTS] ${failureMessage}`, 'warn');
                    (0, recovery_1.failStage)(sessionId, recovery_1.PipelineStage.EXTRACTION, failureMessage);
                    await search_status_service_1.searchStatus.markNoResults(sessionId, failureMessage);
                    return;
                }
                logger_1.logger.error({ sessionId, error: failureMessage }, `[SEARCH_QUEUE] ${TABLE_FLIP} Search failed: ${failureMessage}`);
                search_status_service_1.searchStatus.addLog(sessionId, `[SEARCH_FAILED] ${failureMessage}`, 'error');
                const normalizedFailureMessage = failureMessage.toLowerCase();
                const isTimeout = normalizedFailureMessage.includes('timed out') || normalizedFailureMessage.includes('timeout');
                const isBlocked = normalizedFailureMessage.includes('blocked') || normalizedFailureMessage.includes('captcha') || normalizedFailureMessage.includes('sign_in') || normalizedFailureMessage.includes('sign in') || normalizedFailureMessage.includes('consent');
                if (isBlocked) {
                    await search_status_service_1.searchStatus.markGoogleBlocked(sessionId, failureMessage);
                }
                else if (isTimeout) {
                    await search_status_service_1.searchStatus.markTimeout(sessionId, failureMessage);
                }
                else {
                    await search_status_service_1.searchStatus.markFailed(sessionId, failureMessage);
                }
                (0, recovery_1.failStage)(sessionId, recovery_1.PipelineStage.EXTRACTION, failureMessage);
                return;
            }
            if (this.isStopRequested(sessionId))
                return;
            search_status_service_1.searchStatus.setState(sessionId, search_state_machine_1.SearchState.SAVING_LEADS);
            search_status_service_1.searchStatus.addLog(sessionId, '[LEAD_SAVED] Finalizing lead storage...', 'info');
            const completedSources = Object.keys(result.results).filter(s => result.results[s].totalStored > 0);
            const failedSources = Object.keys(result.results).filter(s => result.results[s].totalStored === 0);
            logger_1.logger.info({ sessionId, stored: result.totalStored, elapsed }, `[SEARCH_QUEUE] [SEARCH_COMPLETED] Job completed in ${elapsed}ms`);
            await search_status_service_1.searchStatus.markCompleted(sessionId, completedSources, failedSources);
            (0, recovery_1.completeStage)(sessionId, recovery_1.PipelineStage.MONGODB);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;
            const elapsed = Date.now() - jobStartTime;
            if (this.isStopRequested(sessionId) || (error instanceof Error && error.name === 'AbortError')) {
                logger_1.logger.info({ sessionId, elapsed }, `[SEARCH_QUEUE] Search stopped after ${elapsed}ms`);
                return;
            }
            const normalizedMessage = message.toLowerCase();
            const isTimeout = normalizedMessage.includes('timed out') || normalizedMessage.includes('timeout');
            const isBlocked = normalizedMessage.includes('blocked') || normalizedMessage.includes('captcha') || normalizedMessage.includes('sign in') || normalizedMessage.includes('sign_in') || normalizedMessage.includes('consent') || normalizedMessage.includes('rate_limit') || normalizedMessage.includes('unusual traffic');
            logger_1.logger.error({ sessionId, err: message, elapsed }, `[SEARCH_QUEUE] ${TABLE_FLIP} Job failed with exception after ${elapsed}ms: ${message}`);
            search_status_service_1.searchStatus.addLog(sessionId, `[SEARCH_FAILED] ${message}`, 'error');
            const savedCount = (await SearchHistory_1.SearchHistory.findOne({ searchSessionId: sessionId }).lean())?.currentSaved || 0;
            if (savedCount > 0 && !isBlocked && !isTimeout) {
                const durationMs = elapsed;
                const session = search_status_service_1.searchStatus.getProgress(sessionId);
                if (session) {
                    await SearchHistory_1.SearchHistory.updateOne({ searchSessionId: sessionId }, {
                        $set: {
                            status: 'PARTIAL_SUCCESS',
                            searchState: 'PARTIAL_SUCCESS',
                            isRunning: false,
                            completedAt: new Date(),
                            duration: durationMs,
                            failureReason: `Partial completion: saved ${savedCount} leads before failure. Error: ${message}`,
                            failureClassification: 'BACKEND_CRASH',
                            maxProgressReached: session.progressPercentage || 0,
                            lastUpdateTime: new Date(),
                        },
                    });
                    await search_status_service_1.searchStatus.captureErrorMetadata(sessionId, message, errorStack);
                    search_status_service_1.searchStatus.addLog(sessionId, `[PARTIAL_SUCCESS] ${savedCount} leads saved before failure`, 'warn');
                    emitSearchHistoryUpdatePartial(sessionId, session, savedCount, message);
                }
                (0, recovery_1.failStage)(sessionId, recovery_1.PipelineStage.EXTRACTION, message);
            }
            else if (isBlocked) {
                await search_status_service_1.searchStatus.markGoogleBlocked(sessionId, message, [], errorStack);
            }
            else if (isTimeout) {
                await search_status_service_1.searchStatus.markTimeout(sessionId, message, [], errorStack);
            }
            else {
                await search_status_service_1.searchStatus.markFailed(sessionId, message, [], errorStack);
            }
            (0, recovery_1.failStage)(sessionId, recovery_1.PipelineStage.EXTRACTION, message);
        }
        finally {
            this.activeSessions.delete(sessionId);
            this.stopRequested.delete(sessionId);
            this.abortControllers.delete(sessionId);
            this.sessionLocks.delete(sessionId);
        }
    }
    reset() {
        for (const controller of this.abortControllers.values()) {
            try {
                controller.abort();
            }
            catch { }
        }
        this.activeSessions.clear();
        this.stopRequested.clear();
        this.sessionLocks.clear();
        this.abortControllers.clear();
        this.queue = [];
    }
    async recoverStuckSessions() {
        const stuck = await SearchHistory_1.SearchHistory.find({
            status: 'running',
            isRunning: true,
        }).lean();
        for (const record of stuck) {
            const sessionId = record.searchSessionId;
            if (this.activeSessions.has(sessionId))
                continue;
            const lastHeartbeat = record.lastHeartbeat || record.updatedAt || record.startedAt;
            const ageMs = Date.now() - new Date(lastHeartbeat).getTime();
            if (ageMs < 120000) {
                logger_1.logger.info({ sessionId }, `[SEARCH_QUEUE] Recovering active session after restart`);
                search_status_service_1.searchStatus.restoreFromDB(record);
                search_status_service_1.searchStatus.setState(sessionId, search_state_machine_1.SearchState.QUEUED);
                search_status_service_1.searchStatus.addLog(sessionId, 'Session recovered after server restart', 'info');
                const locationString = (0, location_query_builder_1.buildLocationString)({
                    area: record.area,
                    city: record.city,
                    state: record.state,
                    country: record.country,
                });
                await this.enqueue(sessionId, {
                    keyword: record.keyword,
                    location: locationString,
                    sources: Array.isArray(record.sources) && record.sources.length > 0
                        ? record.sources
                        : [...scraper_service_1.DEFAULT_SEARCH_SOURCES],
                    limit: 0,
                    state: record.state,
                    city: record.city,
                    area: record.area,
                    country: record.country,
                    businessType: record.keyword,
                    sessionId,
                });
            }
            else {
                logger_1.logger.warn({ sessionId, ageMs }, `[SEARCH_QUEUE] Marking stale session as failed`);
                await search_status_service_1.searchStatus.markFailed(sessionId, 'Session timed out after server restart');
            }
        }
    }
}
exports.searchQueue = new SearchQueueService();
class SearchCleanupService {
    async resetAll(deleteCompleted = false) {
        const summary = {
            sessionsRemoved: 0,
            analyticsRemoved: 0,
            queueReset: false,
            inMemoryCleared: false,
            browserPoolRecreated: false,
            scraperBrowserReset: false,
            workersStopped: false,
            leadCacheCleared: false,
            orphanLeads: 0,
            errors: [],
        };
        try {
            search_status_service_1.searchStatus.cleanupAll();
            summary.inMemoryCleared = true;
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            summary.errors.push(`inMemoryClear: ${msg}`);
        }
        try {
            exports.searchQueue.reset();
            summary.queueReset = true;
            summary.workersStopped = true;
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            summary.errors.push(`queueReset: ${msg}`);
        }
        try {
            await browser_pool_service_1.browserPool.reset();
            summary.browserPoolRecreated = true;
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            summary.errors.push(`browserPoolReset: ${msg}`);
        }
        try {
            await browser_manager_1.browserManager.reset();
            summary.scraperBrowserReset = true;
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            summary.errors.push(`scraperBrowserReset: ${msg}`);
        }
        try {
            lead_storage_1.leadStorage.clearSessionCache();
            summary.leadCacheCleared = true;
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            summary.errors.push(`leadCacheClear: ${msg}`);
        }
        try {
            const staleStates = [
                search_state_machine_1.SearchState.QUEUED,
                search_state_machine_1.SearchState.STARTING_BROWSER,
                search_state_machine_1.SearchState.BROWSER_READY,
                search_state_machine_1.SearchState.SEARCHING_GOOGLE_MAPS,
                search_state_machine_1.SearchState.SCRAPING_RESULTS,
                search_state_machine_1.SearchState.PROCESSING_RESULTS,
                search_state_machine_1.SearchState.SAVING_LEADS,
                search_state_machine_1.SearchState.FAILED,
                search_state_machine_1.SearchState.STOPPED,
            ];
            const filter = deleteCompleted
                ? {}
                : {
                    $or: [
                        { searchState: { $in: staleStates } },
                        { status: { $ne: 'completed' } },
                    ],
                };
            const deleteResult = await SearchHistory_1.SearchHistory.deleteMany(filter);
            summary.sessionsRemoved = deleteResult.deletedCount;
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            summary.errors.push(`sessionDelete: ${msg}`);
        }
        try {
            const analyticsResult = await SearchAnalytics_1.SearchAnalytics.deleteMany({});
            summary.analyticsRemoved = analyticsResult.deletedCount;
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            summary.errors.push(`analyticsDelete: ${msg}`);
        }
        try {
            const activeIds = await SearchHistory_1.SearchHistory.distinct('searchSessionId');
            summary.orphanLeads = await Lead_1.Lead.countDocuments({
                searchSessionId: { $nin: activeIds },
            });
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            summary.errors.push(`orphanCheck: ${msg}`);
        }
        return summary;
    }
    async startupCleanup() {
        const summary = await this.resetAll(false);
        logger_1.logger.info('====================================');
        logger_1.logger.info('Search Queue Cleanup');
        logger_1.logger.info('====================');
        logger_1.logger.info(`Removed Sessions: ${summary.sessionsRemoved}`);
        logger_1.logger.info(`Removed Jobs: ${summary.queueReset ? 'All queued jobs cleared' : 'Failed'}`);
        logger_1.logger.info(`Removed Locks: ${summary.workersStopped ? 'All locks released' : 'Failed'}`);
        logger_1.logger.info(`Removed Analytics: ${summary.analyticsRemoved}`);
        logger_1.logger.info(`Browser Pool: ${summary.browserPoolRecreated ? 'Recreated' : 'Failed'}`);
        logger_1.logger.info(`Scraper Browser: ${summary.scraperBrowserReset ? 'Reset' : 'Failed'}`);
        logger_1.logger.info(`Lead Cache: ${summary.leadCacheCleared ? 'Cleared' : 'Failed'}`);
        logger_1.logger.info(`In-Memory State: ${summary.inMemoryCleared ? 'Cleared' : 'Failed'}`);
        if (summary.errors.length > 0) {
            logger_1.logger.warn(`Cleanup Errors: ${summary.errors.join(', ')}`);
        }
        logger_1.logger.info('Cleanup Completed Successfully');
        logger_1.logger.info('==============================');
    }
}
exports.searchCleanup = new SearchCleanupService();
//# sourceMappingURL=search-queue.service.js.map