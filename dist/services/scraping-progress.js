"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapingProgress = void 0;
class ScrapingProgressTracker {
    constructor() {
        this.sessions = new Map();
    }
    createSession(sessionId, data) {
        const session = {
            sessionId,
            keyword: data.keyword || '',
            location: data.location || '',
            area: data.area || '',
            city: data.city || '',
            state: data.state || '',
            businessType: data.businessType || '',
            status: 'running',
            totalFound: 0,
            totalScraped: 0,
            totalSaved: 0,
            totalDuplicates: 0,
            totalRejected: 0,
            errors: [],
            startedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        this.sessions.set(sessionId, session);
        return session;
    }
    createSemanticSession(sessionId, data, totalQueries) {
        const session = this.createSession(sessionId, data);
        const queries = [];
        for (let i = 0; i < totalQueries; i++) {
            queries.push({
                queryId: `q_${sessionId}_${i}`,
                keyword: '',
                source: '',
                status: 'pending',
                leadsFound: 0,
                leadsStored: 0,
                error: null,
                startedAt: null,
                completedAt: null,
                durationMs: 0,
                retriesUsed: 0,
            });
        }
        session.semanticQueries = queries;
        session.totalSemanticQueries = totalQueries;
        session.completedSemanticQueries = 0;
        session.failedSemanticQueries = 0;
        session.isPartialSuccess = false;
        return session;
    }
    updateSemanticQueryProgress(sessionId, queryIndex, updates) {
        const session = this.sessions.get(sessionId);
        if (session && session.semanticQueries && session.semanticQueries[queryIndex]) {
            Object.assign(session.semanticQueries[queryIndex], updates);
            session.updatedAt = new Date().toISOString();
        }
    }
    setSemanticQueryCompleted(sessionId, queryIndex) {
        this.updateSemanticQueryProgress(sessionId, queryIndex, {
            status: 'completed',
            completedAt: new Date().toISOString(),
            durationMs: 0,
        });
        const session = this.sessions.get(sessionId);
        if (session) {
            session.completedSemanticQueries = (session.completedSemanticQueries || 0) + 1;
        }
    }
    setSemanticQueryFailed(sessionId, queryIndex, error) {
        this.updateSemanticQueryProgress(sessionId, queryIndex, {
            status: 'failed',
            error,
            completedAt: new Date().toISOString(),
        });
        const session = this.sessions.get(sessionId);
        if (session) {
            session.failedSemanticQueries = (session.failedSemanticQueries || 0) + 1;
        }
    }
    setSemanticQuerySkipped(sessionId, queryIndex, reason) {
        this.updateSemanticQueryProgress(sessionId, queryIndex, {
            status: 'skipped',
            error: reason,
            completedAt: new Date().toISOString(),
        });
        const session = this.sessions.get(sessionId);
        if (session) {
            session.completedSemanticQueries = (session.completedSemanticQueries || 0) + 1;
        }
    }
    markPartialSuccess(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.isPartialSuccess = true;
        }
    }
    updateProgress(sessionId, updates) {
        const session = this.sessions.get(sessionId);
        if (session) {
            Object.assign(session, updates);
            session.updatedAt = new Date().toISOString();
        }
    }
    incrementFound(sessionId, count = 1) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.totalFound += count;
            session.updatedAt = new Date().toISOString();
        }
    }
    incrementScraped(sessionId, count = 1) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.totalScraped += count;
            session.updatedAt = new Date().toISOString();
        }
    }
    incrementSaved(sessionId, count = 1) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.totalSaved += count;
            session.updatedAt = new Date().toISOString();
        }
    }
    incrementDuplicates(sessionId, count = 1) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.totalDuplicates += count;
            session.updatedAt = new Date().toISOString();
        }
    }
    incrementRejected(sessionId, count = 1) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.totalRejected += count;
            session.updatedAt = new Date().toISOString();
        }
    }
    getProgress(sessionId) {
        return this.sessions.get(sessionId) || null;
    }
    completeSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.status = 'completed';
            session.updatedAt = new Date().toISOString();
        }
    }
    failSession(sessionId, error) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.status = 'failed';
            session.errors.push(error);
            session.updatedAt = new Date().toISOString();
        }
    }
    generateSessionId() {
        return `scrape_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }
    cleanupOldSessions(maxAgeMs = 3600000) {
        const now = Date.now();
        for (const [id, session] of this.sessions) {
            if (now - new Date(session.startedAt).getTime() > maxAgeMs) {
                this.sessions.delete(id);
            }
        }
    }
}
exports.scrapingProgress = new ScrapingProgressTracker();
//# sourceMappingURL=scraping-progress.js.map