"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchStatus = void 0;
const socket_manager_1 = require("../modules/automation-monitor/socket-manager");
const SearchHistory_1 = require("../models/SearchHistory");
const Lead_1 = require("../models/Lead");
const logger_1 = require("../utils/logger");
const search_state_machine_1 = require("../automation/search-state-machine");
const MAX_LOGS = 200;
const THROTTLE_MS = 300;
class SearchStatusTracker {
    constructor() {
        this.sessions = new Map();
        this.emitTimers = new Map();
        this.persistTimers = new Map();
        this.pendingUpdates = new Map();
    }
    transitionState(sessionId, newState) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        const currentState = session.searchState;
        if (currentState === newState)
            return;
        (0, search_state_machine_1.assertValidTransition)(currentState, newState);
        logger_1.logger.info({
            sessionId,
            from: currentState,
            to: newState,
        }, `[STATE] Search ${sessionId}\n${currentState} → ${newState}`);
        session.searchState = newState;
        session.status = (0, search_state_machine_1.searchStateToLegacyStatus)(newState);
        session.currentStage = newState;
        session.updatedAt = new Date().toISOString();
        (0, socket_manager_1.emitSearchStage)(sessionId, newState);
        if ((0, search_state_machine_1.isTerminal)(newState)) {
            session.completedAt = session.completedAt || new Date().toISOString();
            session.progressPercentage = newState === search_state_machine_1.SearchState.COMPLETED ? 100 : session.progressPercentage;
        }
    }
    async persistSearchState(sessionId, updates = {}) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        try {
            const finalStatus = (0, search_state_machine_1.searchStateToFinalStatus)(session.searchState);
            await SearchHistory_1.SearchHistory.updateOne({ searchSessionId: sessionId }, {
                $set: {
                    searchState: session.searchState,
                    status: finalStatus,
                    isRunning: !(0, search_state_machine_1.isTerminal)(session.searchState),
                    totalFound: session.leadsFound,
                    uniqueSaved: session.uniqueLeads,
                    duplicates: session.duplicatesRemoved,
                    duplicatesRemoved: session.duplicatesRemoved,
                    progress: session.progressPercentage,
                    currentFound: session.leadsFound,
                    currentSaved: session.uniqueLeads,
                    currentDuplicates: session.duplicatesRemoved,
                    estimatedTotal: session.estimatedTotal,
                    currentSource: session.currentSource,
                    currentStage: session.currentStage,
                    currentBusiness: session.currentBusiness,
                    currentUrl: session.currentUrl,
                    eta: session.eta,
                    totalProcessed: session.totalProcessed,
                    failedCount: session.failedCount,
                    error: session.error,
                    sourceBreakdown: session.sourceBreakdown,
                    lastHeartbeat: new Date(),
                    lastUpdateTime: new Date(),
                    ...updates,
                },
            });
        }
        catch (err) {
            logger_1.logger.error({ err: err instanceof Error ? err.message : String(err) }, 'SearchStatusTracker: Failed to persist state');
        }
    }
    throttledEmit(sessionId) {
        if (this.emitTimers.has(sessionId))
            return;
        this.emitTimers.set(sessionId, setTimeout(() => {
            this.emitTimers.delete(sessionId);
            this.emitProgress(sessionId);
        }, THROTTLE_MS));
    }
    throttledPersist(sessionId) {
        if (this.persistTimers.has(sessionId))
            return;
        this.persistTimers.set(sessionId, setTimeout(() => {
            this.persistTimers.delete(sessionId);
            this.persistSearchState(sessionId).catch(() => { });
        }, THROTTLE_MS));
    }
    createSession(sessionId, data) {
        const existing = this.sessions.get(sessionId);
        if (existing) {
            if (data.keyword)
                existing.keyword = data.keyword;
            if (data.location)
                existing.location = data.location;
            return existing;
        }
        const session = {
            sessionId,
            keyword: data.keyword || '',
            location: data.location || '',
            state: data.state,
            city: data.city,
            area: data.area,
            country: data.country,
            sources: data.sources || ['google-maps'],
            searchState: search_state_machine_1.SearchState.CREATING_SESSION,
            status: 'running',
            leadsFound: 0,
            uniqueLeads: 0,
            duplicatesRemoved: 0,
            sourceBreakdown: {},
            keywordBreakdown: {},
            liveLeads: [],
            startedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            failedCount: 0,
            progressPercentage: 0,
            estimatedRemaining: 0,
            currentSource: data.sources && data.sources.length > 0 ? data.sources[0] : '',
            estimatedTotal: 0,
            currentStage: 'CREATING_SESSION',
            currentBusiness: '',
            currentUrl: '',
            eta: 0,
            totalProcessed: 0,
            logs: [],
            createdBy: data.createdBy,
        };
        this.sessions.set(sessionId, session);
        (0, socket_manager_1.emitSearchStart)(sessionId, {
            keyword: session.keyword,
            location: session.location,
            state: session.state,
            city: session.city,
            area: session.area,
            sources: session.sources,
        });
        SearchHistory_1.SearchHistory.findOneAndUpdate({ searchSessionId: sessionId }, {
            $setOnInsert: {
                searchSessionId: sessionId,
                keyword: session.keyword,
                state: session.state,
                city: session.city,
                area: session.area,
                sources: session.sources,
                startedAt: new Date(session.startedAt),
                searchState: search_state_machine_1.SearchState.CREATING_SESSION,
                status: 'running',
                isRunning: true,
                progress: 0,
                currentFound: 0,
                currentSaved: 0,
                currentDuplicates: 0,
                failedCount: 0,
                estimatedTotal: 0,
                currentSource: '',
                currentStage: 'CREATING_SESSION',
                createdBy: session.createdBy || undefined,
            },
        }, { upsert: true }).catch(err => {
            logger_1.logger.error({ err: err instanceof Error ? err.message : String(err) }, 'SearchStatusTracker: Failed to upsert search history');
        });
        this.transitionState(sessionId, search_state_machine_1.SearchState.QUEUED);
        this.persistSearchState(sessionId).catch(() => { });
        return session;
    }
    restoreFromDB(record) {
        const existing = this.sessions.get(record.searchSessionId);
        if (existing)
            return existing;
        const restoredState = Object.values(search_state_machine_1.SearchState).includes(record.searchState)
            ? record.searchState
            : search_state_machine_1.SearchState.QUEUED;
        const session = {
            sessionId: record.searchSessionId,
            keyword: record.keyword || '',
            location: [record.area, record.city, record.state].filter(Boolean).join(', '),
            state: record.state,
            city: record.city,
            area: record.area,
            sources: record.sources || [],
            searchState: restoredState,
            status: record.status || 'running',
            leadsFound: record.currentFound || record.totalFound || 0,
            uniqueLeads: record.currentSaved || record.uniqueSaved || 0,
            duplicatesRemoved: record.currentDuplicates || record.duplicatesRemoved || 0,
            sourceBreakdown: record.sourceBreakdown || {},
            keywordBreakdown: {},
            liveLeads: [],
            startedAt: record.startedAt?.toISOString() || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            failedCount: record.failedCount || 0,
            progressPercentage: record.progress || 0,
            estimatedRemaining: 0,
            currentSource: record.currentSource || '',
            estimatedTotal: record.estimatedTotal || 0,
            currentStage: record.currentStage || '',
            currentBusiness: record.currentBusiness || '',
            currentUrl: record.currentUrl || '',
            eta: record.eta || 0,
            totalProcessed: record.totalProcessed || 0,
            logs: (record.logs || []).map(l => ({
                timestamp: l.timestamp?.toISOString() || new Date().toISOString(),
                message: l.message,
                level: l.level,
            })),
            lastHeartbeat: record.lastHeartbeat?.toISOString(),
        };
        this.sessions.set(session.sessionId, session);
        return session;
    }
    addLog(sessionId, message, level = 'info') {
        const session = this.sessions.get(sessionId);
        const entry = {
            timestamp: new Date().toISOString(),
            message,
            level,
        };
        if (session) {
            session.logs.push(entry);
            if (session.logs.length > MAX_LOGS) {
                session.logs = session.logs.slice(-MAX_LOGS);
            }
            session.updatedAt = new Date().toISOString();
        }
        (0, socket_manager_1.emitSearchLog)(sessionId, entry);
        SearchHistory_1.SearchHistory.updateOne({ searchSessionId: sessionId }, {
            $push: { logs: { $each: [entry], $slice: -MAX_LOGS } },
            $set: { lastHeartbeat: new Date() },
        }).catch(() => { });
    }
    updateStage(sessionId, stage) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.currentStage = stage;
            session.updatedAt = new Date().toISOString();
        }
        (0, socket_manager_1.emitSearchStage)(sessionId, stage);
        SearchHistory_1.SearchHistory.updateOne({ searchSessionId: sessionId }, { $set: { currentStage: stage, lastHeartbeat: new Date() } }).catch(() => { });
        this.emitProgress(sessionId);
    }
    setState(sessionId, newState) {
        this.transitionState(sessionId, newState);
        this.emitProgress(sessionId);
        this.persistSearchState(sessionId).catch(() => { });
    }
    updateCurrentBusiness(sessionId, business, url) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.currentBusiness = business;
            if (url)
                session.currentUrl = url;
            session.updatedAt = new Date().toISOString();
        }
        SearchHistory_1.SearchHistory.updateOne({ searchSessionId: sessionId }, { $set: { currentBusiness: business, currentUrl: url || '', lastHeartbeat: new Date() } }).catch(() => { });
        this.emitProgress(sessionId);
    }
    heartbeat(sessionId) {
        const session = this.sessions.get(sessionId);
        const now = new Date().toISOString();
        if (session) {
            session.lastHeartbeat = now;
            session.updatedAt = now;
        }
        (0, socket_manager_1.emitSearchHeartbeat)(sessionId, { timestamp: now });
        SearchHistory_1.SearchHistory.updateOne({ searchSessionId: sessionId }, { $set: { lastHeartbeat: new Date() } }).catch(() => { });
    }
    incrementFound(sessionId, count = 1) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.leadsFound += count;
            session.updatedAt = new Date().toISOString();
            this.recalculatePercentage(session);
            this.throttledEmit(sessionId);
            this.throttledPersist(sessionId);
        }
    }
    incrementSaved(sessionId, count = 1) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.uniqueLeads += count;
            session.totalProcessed = session.uniqueLeads + session.duplicatesRemoved + session.failedCount;
            session.updatedAt = new Date().toISOString();
            this.recalculatePercentage(session);
            (0, socket_manager_1.emitLeadSaved)(sessionId, { totalSaved: session.uniqueLeads });
            this.throttledEmit(sessionId);
            this.throttledPersist(sessionId);
        }
    }
    incrementDuplicates(sessionId, count = 1) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.duplicatesRemoved += count;
            session.totalProcessed = session.uniqueLeads + session.duplicatesRemoved + session.failedCount;
            session.updatedAt = new Date().toISOString();
            this.recalculatePercentage(session);
            (0, socket_manager_1.emitDuplicateRemoved)(sessionId, { totalDuplicates: session.duplicatesRemoved });
            this.throttledEmit(sessionId);
            this.throttledPersist(sessionId);
        }
    }
    incrementFailed(sessionId, count = 1) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.failedCount += count;
            session.totalProcessed = session.uniqueLeads + session.duplicatesRemoved + session.failedCount;
            session.updatedAt = new Date().toISOString();
            this.recalculatePercentage(session);
            this.throttledEmit(sessionId);
            this.throttledPersist(sessionId);
        }
    }
    updateLeadsFound(sessionId, count) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.leadsFound = count;
            session.updatedAt = new Date().toISOString();
            this.recalculatePercentage(session);
            this.emitProgress(sessionId);
            this.persistSearchState(sessionId).catch(() => { });
        }
    }
    updateEstimatedTotal(sessionId, total) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.estimatedTotal = total;
            this.recalculatePercentage(session);
            this.persistSearchState(sessionId).catch(() => { });
        }
    }
    updateCurrentSource(sessionId, source) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.currentSource = source;
            session.updatedAt = new Date().toISOString();
            this.emitProgress(sessionId);
            this.persistSearchState(sessionId).catch(() => { });
        }
    }
    recalculatePercentage(session) {
        if (session.leadsFound === 0) {
            session.progressPercentage = session.estimatedTotal > 0
                ? Math.min(10, Math.round((session.totalProcessed / session.estimatedTotal) * 100))
                : 0;
            session.estimatedRemaining = session.estimatedTotal;
            session.eta = 0;
        }
        else {
            const processed = session.uniqueLeads + session.duplicatesRemoved + session.failedCount;
            session.totalProcessed = processed;
            session.progressPercentage = Math.min(99, Math.round((processed / session.leadsFound) * 100));
            session.estimatedRemaining = Math.max(0, session.leadsFound - processed);
            const elapsedMs = Date.now() - new Date(session.startedAt).getTime();
            if (processed > 0) {
                const avgPerLead = elapsedMs / processed;
                session.eta = Math.round((session.estimatedRemaining * avgPerLead) / 1000);
            }
        }
    }
    emitProgress(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        (0, socket_manager_1.emitSearchProgress)(sessionId, {
            foundCount: session.leadsFound,
            savedCount: session.uniqueLeads,
            duplicateCount: session.duplicatesRemoved,
            failedCount: session.failedCount,
            progress: session.progressPercentage,
            currentSource: session.currentSource,
            currentLead: session.currentBusiness || session.liveLeads[session.liveLeads.length - 1] || '',
            currentStage: session.searchState,
            currentUrl: session.currentUrl,
            eta: session.eta,
            totalProcessed: session.totalProcessed,
            updatedAt: new Date().toISOString(),
        });
    }
    updateUniqueLeads(sessionId, count) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.uniqueLeads = count;
            session.updatedAt = new Date().toISOString();
            this.recalculatePercentage(session);
            this.persistSearchState(sessionId).catch(() => { });
        }
    }
    updateDuplicatesRemoved(sessionId, count) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.duplicatesRemoved = count;
            session.updatedAt = new Date().toISOString();
            this.recalculatePercentage(session);
            this.persistSearchState(sessionId).catch(() => { });
        }
    }
    updateSourceBreakdown(sessionId, source, count) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.sourceBreakdown[source] = count;
            session.updatedAt = new Date().toISOString();
            (0, socket_manager_1.emitSourceUpdate)(sessionId, { source, count, status: 'completed' });
            this.emitProgress(sessionId);
            this.persistSearchState(sessionId).catch(() => { });
        }
    }
    updateKeywordBreakdown(sessionId, keyword, count) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.keywordBreakdown[keyword] = count;
            session.updatedAt = new Date().toISOString();
        }
    }
    addLiveLead(sessionId, businessName, source = '') {
        const session = this.sessions.get(sessionId);
        if (session && !session.liveLeads.includes(businessName)) {
            session.liveLeads.push(businessName);
            if (session.liveLeads.length > 50) {
                session.liveLeads = session.liveLeads.slice(-50);
            }
            session.updatedAt = new Date().toISOString();
            (0, socket_manager_1.emitLeadFound)(sessionId, {
                businessName,
                source,
                totalLeads: session.leadsFound,
            });
        }
    }
    async markCompleted(sessionId, completedSources = [], failedSources = []) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        this.clearThrottleTimers(sessionId);
        this.transitionState(sessionId, search_state_machine_1.SearchState.SAVING_LEADS);
        this.transitionState(sessionId, search_state_machine_1.SearchState.COMPLETED);
        session.progressPercentage = 100;
        session.estimatedRemaining = 0;
        session.eta = 0;
        session.completedAt = new Date().toISOString();
        session.updatedAt = new Date().toISOString();
        this.addLog(sessionId, 'Search completed successfully', 'info');
        this.emitProgress(sessionId);
        const totalLeads = await Lead_1.Lead.countDocuments({ searchSessionId: sessionId });
        const durationMs = Date.now() - new Date(session.startedAt).getTime();
        (0, socket_manager_1.emitSearchCompleted)(sessionId, {
            keyword: session.keyword,
            location: session.location,
            totalLeads: session.leadsFound,
            uniqueLeads: session.uniqueLeads,
            duplicatesRemoved: session.duplicatesRemoved,
            failedCount: session.failedCount,
            sourceBreakdown: { ...session.sourceBreakdown },
            durationMs,
            state: session.state,
            city: session.city,
            area: session.area,
            sources: session.sources,
            status: 'completed',
            progress: 100,
            finishedAt: session.completedAt,
        });
        await this.persistSearchState(sessionId, {
            completedAt: new Date(session.completedAt),
            duration: durationMs,
            completedSources,
            failedSources,
            totalLeads,
            status: 'COMPLETED',
            businessesFound: session.leadsFound,
            businessesSaved: session.uniqueLeads,
            duplicates: session.duplicatesRemoved,
            maxProgressReached: 100,
        });
        await this.emitHistoryUpdate(session);
    }
    classifyError(error) {
        const msg = error.toLowerCase();
        if (msg.includes('playwright') || msg.includes('browser') || msg.includes('target page'))
            return 'PLAYWRIGHT_CRASH';
        if (msg.includes('blocked') || msg.includes('captcha') || msg.includes('sign_in') || msg.includes('sign in') || msg.includes('consent') || msg.includes('unusual traffic') || msg.includes('rate_limit'))
            return 'GOOGLE_BLOCKED';
        if (msg.includes('closed') || msg.includes('disconnected'))
            return 'BROWSER_CLOSED';
        if (msg.includes('timeout') || msg.includes('timed out'))
            return 'NETWORK_TIMEOUT';
        if (msg.includes('user stopped') || msg.includes('stopped by user'))
            return 'USER_STOPPED';
        if (msg.includes('crash') || msg.includes('exception') || msg.includes('backend'))
            return 'BACKEND_CRASH';
        if (msg.includes('socket') || msg.includes('ws'))
            return 'SOCKET_DISCONNECT';
        if (msg.includes('no results') || msg.includes('not found'))
            return 'NO_RESULTS_FOUND';
        if (msg.includes('auth') || msg.includes('unauthorized') || msg.includes('401'))
            return 'AUTH_EXPIRED';
        return 'UNKNOWN';
    }
    async captureErrorMetadata(sessionId, error, stack, browserError, googleMapsError, playwrightError, networkError) {
        try {
            const req = require('express')?.request;
            const userAgent = req?.get('user-agent') || 'unknown';
            const ipAddress = req?.ip || 'unknown';
            await SearchHistory_1.SearchHistory.updateOne({ searchSessionId: sessionId }, {
                $set: {
                    errorMetadata: {
                        errorName: error?.split(':')[0] || 'Error',
                        errorMessage: error || 'Unknown error',
                        errorStack: stack ? stack.substring(0, 2000) : undefined,
                        browserError: browserError?.substring(0, 500),
                        googleMapsError: googleMapsError?.substring(0, 500),
                        playwrightError: playwrightError?.substring(0, 500),
                        networkError: networkError?.substring(0, 500),
                        userAgent,
                        ipAddress,
                        browserType: userAgent?.includes('Chrome') ? 'Chrome' : userAgent?.includes('Firefox') ? 'Firefox' : 'Unknown',
                        deviceType: userAgent?.includes('Mobile') ? 'Mobile' : 'Desktop',
                    },
                    lastUpdateTime: new Date(),
                },
            });
        }
        catch (err) {
            logger_1.logger.error({ err }, 'Failed to capture error metadata');
        }
    }
    async markFailed(sessionId, error, failedSources = [], errorStack) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        if ((0, search_state_machine_1.isTerminal)(session.searchState))
            return;
        this.clearThrottleTimers(sessionId);
        this.transitionState(sessionId, search_state_machine_1.SearchState.FAILED);
        session.error = error;
        session.completedAt = new Date().toISOString();
        session.updatedAt = new Date().toISOString();
        this.addLog(sessionId, `Search failed: ${error}`, 'error');
        (0, socket_manager_1.emitSearchError)(sessionId, { error });
        const failureClassification = this.classifyError(error);
        const durationMs = Date.now() - new Date(session.startedAt).getTime();
        await this.captureErrorMetadata(sessionId, error, errorStack);
        await this.persistSearchState(sessionId, {
            completedAt: new Date(session.completedAt),
            duration: durationMs,
            failedSources,
            failureReason: error,
            failureClassification,
            status: 'FAILED',
            maxProgressReached: Math.max(session.progressPercentage || 0, session.progressPercentage || 0),
        });
        await this.emitHistoryUpdate(session);
    }
    async markTimeout(sessionId, error, failedSources = [], errorStack) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        if ((0, search_state_machine_1.isTerminal)(session.searchState))
            return;
        this.clearThrottleTimers(sessionId);
        this.transitionState(sessionId, search_state_machine_1.SearchState.TIMEOUT);
        session.error = error;
        session.completedAt = new Date().toISOString();
        session.updatedAt = new Date().toISOString();
        this.addLog(sessionId, `Search timed out: ${error}`, 'error');
        (0, socket_manager_1.emitSearchTimeout)(sessionId, { error });
        const durationMs = Date.now() - new Date(session.startedAt).getTime();
        await this.captureErrorMetadata(sessionId, error, errorStack, undefined, undefined, undefined, 'Network timeout');
        await this.persistSearchState(sessionId, {
            completedAt: new Date(session.completedAt),
            duration: durationMs,
            failedSources,
            failureReason: error,
            failureClassification: 'NETWORK_TIMEOUT',
            status: 'TIMEOUT',
            maxProgressReached: Math.max(session.progressPercentage || 0, session.progressPercentage || 0),
        });
        await this.emitHistoryUpdate(session);
    }
    async markGoogleBlocked(sessionId, error, failedSources = [], errorStack) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        if ((0, search_state_machine_1.isTerminal)(session.searchState))
            return;
        this.clearThrottleTimers(sessionId);
        this.transitionState(sessionId, search_state_machine_1.SearchState.GOOGLE_BLOCKED);
        session.error = error;
        session.completedAt = new Date().toISOString();
        session.updatedAt = new Date().toISOString();
        this.addLog(sessionId, `Search blocked by Google: ${error}`, 'error');
        (0, socket_manager_1.emitSearchGoogleBlocked)(sessionId, { error });
        const durationMs = Date.now() - new Date(session.startedAt).getTime();
        await this.captureErrorMetadata(sessionId, error, errorStack, undefined, 'Google Maps blocked request', undefined);
        await this.persistSearchState(sessionId, {
            completedAt: new Date(session.completedAt),
            duration: durationMs,
            failedSources,
            failureReason: error,
            failureClassification: 'GOOGLE_BLOCKED',
            status: 'FAILED',
            maxProgressReached: Math.max(session.progressPercentage || 0, session.progressPercentage || 0),
        });
        await this.emitHistoryUpdate(session);
    }
    async markNoResults(sessionId, message) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        if ((0, search_state_machine_1.isTerminal)(session.searchState))
            return;
        this.clearThrottleTimers(sessionId);
        this.transitionState(sessionId, search_state_machine_1.SearchState.NO_RESULTS);
        session.completedAt = new Date().toISOString();
        session.updatedAt = new Date().toISOString();
        this.addLog(sessionId, `No results: ${message}`, 'warn');
        (0, socket_manager_1.emitSearchNoResults)(sessionId, { message });
        const durationMs = Date.now() - new Date(session.startedAt).getTime();
        await this.persistSearchState(sessionId, {
            completedAt: new Date(session.completedAt),
            duration: durationMs,
            failureReason: message,
            failureClassification: 'NO_RESULTS_FOUND',
            status: 'NO_RESULTS',
            businessesFound: 0,
            businessesSaved: 0,
        });
        await this.emitHistoryUpdate(session);
    }
    async markStopped(sessionId) {
        let session = this.sessions.get(sessionId);
        if (!session) {
            const record = await SearchHistory_1.SearchHistory.findOne({ searchSessionId: sessionId }).lean();
            if (!record)
                return;
            session = this.restoreFromDB(record);
        }
        if ((0, search_state_machine_1.isTerminal)(session.searchState))
            return;
        session.searchState = search_state_machine_1.SearchState.STOPPED;
        session.status = 'stopped';
        session.currentStage = search_state_machine_1.SearchState.STOPPED;
        session.completedAt = new Date().toISOString();
        session.updatedAt = new Date().toISOString();
        this.addLog(sessionId, 'Search stopped by user', 'warn');
        (0, socket_manager_1.emitSearchStopped)(sessionId);
        const durationMs = Date.now() - new Date(session.startedAt).getTime();
        try {
            await SearchHistory_1.SearchHistory.updateOne({ searchSessionId: sessionId }, {
                $set: {
                    searchState: search_state_machine_1.SearchState.STOPPED,
                    status: 'STOPPED',
                    isRunning: false,
                    currentStage: search_state_machine_1.SearchState.STOPPED,
                    completedAt: new Date(session.completedAt),
                    stoppedAt: new Date(),
                    duration: durationMs,
                    lastHeartbeat: new Date(),
                    lastUpdateTime: new Date(),
                    maxProgressReached: session.progressPercentage || 0,
                    businessesFound: session.leadsFound || 0,
                    businessesSaved: session.uniqueLeads || 0,
                    duplicates: session.duplicatesRemoved || 0,
                    failureClassification: 'USER_STOPPED',
                    failureReason: 'Search stopped by user',
                },
            });
        }
        catch (err) {
            logger_1.logger.error({ err: err instanceof Error ? err.message : String(err), sessionId }, 'markStopped: Failed to persist');
        }
        this.emitHistoryUpdate(session).catch(() => { });
    }
    async emitHistoryUpdate(session) {
        try {
            const totalLeads = await Lead_1.Lead.countDocuments({ searchSessionId: session.sessionId });
            const dbRecord = await SearchHistory_1.SearchHistory.findOne({ searchSessionId: session.sessionId })
                .select('failureReason failureClassification errorMetadata duration businessesFound businessesSaved duplicates maxProgressReached status')
                .lean();
            const durationMs = session.completedAt
                ? new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()
                : 0;
            (0, socket_manager_1.emitSearchHistoryUpdate)(session.sessionId, {
                keyword: session.keyword,
                state: session.state,
                city: session.city,
                area: session.area,
                country: session.country,
                sources: session.sources,
                totalLeads,
                businessesFound: dbRecord?.businessesFound ?? session.leadsFound,
                businessesSaved: dbRecord?.businessesSaved ?? session.uniqueLeads,
                duplicates: dbRecord?.duplicates ?? session.duplicatesRemoved,
                progress: session.progressPercentage,
                maxProgressReached: dbRecord?.maxProgressReached ?? session.progressPercentage,
                startedAt: session.startedAt,
                completedAt: session.completedAt || new Date().toISOString(),
                duration: Math.round(durationMs / 1000),
                status: (0, search_state_machine_1.searchStateToFinalStatus)(session.searchState),
                failureReason: dbRecord?.failureReason || session.error || '',
                failureClassification: dbRecord?.failureClassification,
                searchSessionId: session.sessionId,
            });
        }
        catch {
        }
    }
    getProgress(sessionId) {
        return this.sessions.get(sessionId) || null;
    }
    async getProgressFromDB(sessionId) {
        const inMemory = this.sessions.get(sessionId);
        if (inMemory)
            return inMemory;
        const record = await SearchHistory_1.SearchHistory.findOne({ searchSessionId: sessionId }).lean();
        if (!record)
            return null;
        return this.restoreFromDB(record);
    }
    toApiResponse(session) {
        return {
            sessionId: session.sessionId,
            searchSessionId: session.sessionId,
            keyword: session.keyword,
            location: session.location,
            state: session.state,
            city: session.city,
            area: session.area,
            sources: session.sources,
            searchState: session.searchState,
            status: session.status,
            leadsFound: session.leadsFound,
            uniqueLeads: session.uniqueLeads,
            duplicatesRemoved: session.duplicatesRemoved,
            foundCount: session.leadsFound,
            savedCount: session.uniqueLeads,
            duplicateCount: session.duplicatesRemoved,
            failedCount: session.failedCount,
            progress: session.progressPercentage,
            progressPercentage: session.progressPercentage,
            currentSource: session.currentSource,
            currentLead: session.currentBusiness,
            currentStage: session.currentStage,
            searchStage: session.searchState,
            currentBusiness: session.currentBusiness,
            currentUrl: session.currentUrl,
            eta: session.eta,
            totalProcessed: session.totalProcessed,
            estimatedTotal: session.estimatedTotal,
            estimatedRemaining: session.estimatedRemaining,
            sourceBreakdown: session.sourceBreakdown,
            keywordBreakdown: session.keywordBreakdown,
            liveLeads: session.liveLeads,
            logs: session.logs,
            startedAt: session.startedAt,
            updatedAt: session.updatedAt,
            completedAt: session.completedAt,
            error: session.error,
            lastHeartbeat: session.lastHeartbeat,
        };
    }
    async getActiveSession() {
        const active = await SearchHistory_1.SearchHistory.findOne({ status: 'running', isRunning: true }, {}, { sort: { startedAt: -1 } }).lean();
        if (!active)
            return null;
        const session = this.sessions.get(active.searchSessionId);
        if (session)
            return session;
        const restored = this.restoreFromDB(active);
        (0, socket_manager_1.emitSearchRecovered)(restored.sessionId, {
            keyword: restored.keyword,
            location: restored.location,
            state: restored.state,
            city: restored.city,
            area: restored.area,
            sources: restored.sources,
            leadsFound: restored.leadsFound,
            uniqueLeads: restored.uniqueLeads,
            duplicatesRemoved: restored.duplicatesRemoved,
            failedCount: restored.failedCount,
            progressPercentage: restored.progressPercentage,
            elapsedMs: Date.now() - new Date(restored.startedAt).getTime(),
        });
        return restored;
    }
    clearThrottleTimers(sessionId) {
        const t1 = this.emitTimers.get(sessionId);
        if (t1) {
            clearTimeout(t1);
            this.emitTimers.delete(sessionId);
        }
        const t2 = this.persistTimers.get(sessionId);
        if (t2) {
            clearTimeout(t2);
            this.persistTimers.delete(sessionId);
        }
        this.pendingUpdates.delete(sessionId);
    }
    cleanupOldSessions(maxAgeMs = 3600000) {
        const now = Date.now();
        for (const [id, session] of this.sessions) {
            if (now - new Date(session.startedAt).getTime() > maxAgeMs) {
                this.clearThrottleTimers(id);
                this.sessions.delete(id);
            }
        }
    }
    cleanupAll() {
        for (const id of this.sessions.keys()) {
            this.clearThrottleTimers(id);
        }
        this.sessions.clear();
    }
    generateSessionId() {
        return `search_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }
}
exports.searchStatus = new SearchStatusTracker();
//# sourceMappingURL=search-status.service.js.map