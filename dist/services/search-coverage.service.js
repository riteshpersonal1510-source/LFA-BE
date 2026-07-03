"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchCoverageService = exports.SearchCoverageService = void 0;
const logger_1 = require("../utils/logger");
class SearchCoverageService {
    constructor() {
        this.sessions = new Map();
        this.listeners = new Map();
    }
    createSession(sessionId, originalKeyword, expandedKeywords, sources) {
        const queries = [];
        for (const ek of expandedKeywords) {
            for (const source of sources) {
                queries.push({
                    keyword: ek.keyword,
                    originalKeyword,
                    categoryGroup: ek.categoryGroupName,
                    priority: ek.priority,
                    source,
                    status: 'pending',
                    leadsDiscovered: 0,
                });
            }
        }
        const session = {
            sessionId,
            originalKeyword,
            matchedCategory: expandedKeywords.length > 0 ? expandedKeywords[0].categoryGroupName : null,
            totalQueries: queries.length,
            completedQueries: 0,
            failedQueries: 0,
            totalLeadsDiscovered: 0,
            totalLeadsStored: 0,
            totalDuplicatesRemoved: 0,
            queries,
            startTime: Date.now(),
        };
        this.sessions.set(sessionId, session);
        return session;
    }
    markQueryRunning(sessionId, keyword, source) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        const query = session.queries.find(q => q.keyword === keyword && q.source === source);
        if (query) {
            query.status = 'running';
            query.startTime = Date.now();
        }
    }
    markQueryCompleted(sessionId, keyword, source, leadsFound) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        const query = session.queries.find(q => q.keyword === keyword && q.source === source);
        if (query) {
            query.status = 'completed';
            query.endTime = Date.now();
            query.durationMs = query.endTime - (query.startTime || query.endTime);
            query.leadsDiscovered = leadsFound;
            session.completedQueries++;
            session.totalLeadsDiscovered += leadsFound;
        }
        this.notifyListeners(sessionId);
    }
    markQueryFailed(sessionId, keyword, source, error) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        const query = session.queries.find(q => q.keyword === keyword && q.source === source);
        if (query) {
            query.status = 'failed';
            query.endTime = Date.now();
            query.durationMs = query.endTime - (query.startTime || query.endTime);
            query.error = error;
            session.failedQueries++;
        }
        this.notifyListeners(sessionId);
    }
    addDuplicates(sessionId, count) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.totalDuplicatesRemoved += count;
        }
    }
    addStored(sessionId, count) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.totalLeadsStored += count;
        }
    }
    completeSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.endTime = Date.now();
            session.durationMs = session.endTime - session.startTime;
            logger_1.logger.info({
                action: 'search_session_completed',
                sessionId,
                originalKeyword: session.originalKeyword,
                totalQueries: session.totalQueries,
                completedQueries: session.completedQueries,
                failedQueries: session.failedQueries,
                totalLeadsDiscovered: session.totalLeadsDiscovered,
                totalLeadsStored: session.totalLeadsStored,
                totalDuplicatesRemoved: session.totalDuplicatesRemoved,
                durationMs: session.durationMs,
            }, 'SearchCoverage: Search session completed');
            this.notifyListeners(sessionId);
        }
    }
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    getQueryCoverage(sessionId, keyword, source) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        return session.queries.find(q => q.keyword === keyword && q.source === source);
    }
    subscribe(sessionId, callback) {
        this.listeners.set(sessionId, callback);
    }
    unsubscribe(sessionId) {
        this.listeners.delete(sessionId);
    }
    notifyListeners(sessionId) {
        const session = this.sessions.get(sessionId);
        const callback = this.listeners.get(sessionId);
        if (session && callback) {
            callback(session);
        }
    }
    getAggregateStats() {
        let totalQueries = 0;
        let totalCompletedQueries = 0;
        let totalFailedQueries = 0;
        let totalLeadsDiscovered = 0;
        let totalLeadsStored = 0;
        let totalDuplicatesRemoved = 0;
        const categoryStats = new Map();
        for (const session of this.sessions.values()) {
            totalQueries += session.totalQueries;
            totalCompletedQueries += session.completedQueries;
            totalFailedQueries += session.failedQueries;
            totalLeadsDiscovered += session.totalLeadsDiscovered;
            totalLeadsStored += session.totalLeadsStored;
            totalDuplicatesRemoved += session.totalDuplicatesRemoved;
            for (const query of session.queries) {
                if (query.status === 'completed' && query.leadsDiscovered > 0) {
                    const existing = categoryStats.get(query.categoryGroup) || { leads: 0, queries: 0 };
                    existing.leads += query.leadsDiscovered;
                    existing.queries++;
                    categoryStats.set(query.categoryGroup, existing);
                }
            }
        }
        return {
            totalSessions: this.sessions.size,
            totalQueries,
            totalCompletedQueries,
            totalFailedQueries,
            totalLeadsDiscovered,
            totalLeadsStored,
            totalDuplicatesRemoved,
            topCategories: Array.from(categoryStats.entries())
                .map(([category, stats]) => ({ category, ...stats }))
                .sort((a, b) => b.leads - a.leads)
                .slice(0, 10),
        };
    }
}
exports.SearchCoverageService = SearchCoverageService;
exports.searchCoverageService = new SearchCoverageService();
//# sourceMappingURL=search-coverage.service.js.map