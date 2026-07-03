"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.perfMonitor = void 0;
const logger_1 = require("./logger");
class PerfMonitor {
    constructor() {
        this.entries = [];
        this.active = new Map();
        this.MAX_ENTRIES = 1000;
    }
    start(operation, sessionId, metadata) {
        const id = `${operation}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const entry = {
            operation,
            sessionId,
            startTime: Date.now(),
            metadata,
        };
        this.active.set(id, entry);
        return id;
    }
    end(id, metadata) {
        const entry = this.active.get(id);
        if (!entry)
            return null;
        entry.endTime = Date.now();
        entry.durationMs = entry.endTime - entry.startTime;
        if (metadata)
            entry.metadata = { ...entry.metadata, ...metadata };
        this.entries.push(entry);
        this.active.delete(id);
        if (this.entries.length > this.MAX_ENTRIES) {
            this.entries = this.entries.slice(-this.MAX_ENTRIES);
        }
        return entry.durationMs;
    }
    async measure(operation, fn, options) {
        const id = this.start(operation, options?.sessionId, options?.metadata);
        try {
            const result = await fn();
            const duration = this.end(id);
            if (options?.log && duration !== null) {
                logger_1.logger.info({ operation, durationMs: duration, sessionId: options?.sessionId }, `[PERF] ${operation} completed in ${duration}ms`);
            }
            return result;
        }
        catch (error) {
            this.end(id, { error: error instanceof Error ? error.message : String(error) });
            throw error;
        }
    }
    getRecent(count = 50) {
        return this.entries.slice(-count).reverse();
    }
    getStats(operation) {
        const filtered = operation
            ? this.entries.filter(e => e.operation === operation && e.durationMs != null)
            : this.entries.filter(e => e.durationMs != null);
        if (filtered.length === 0) {
            return { count: 0, avgMs: 0, minMs: 0, maxMs: 0, recentAvgMs: 0 };
        }
        const durations = filtered.map(e => e.durationMs);
        const recent = durations.slice(-20);
        const sum = durations.reduce((a, b) => a + b, 0);
        const recentSum = recent.reduce((a, b) => a + b, 0);
        return {
            count: durations.length,
            avgMs: Math.round(sum / durations.length),
            minMs: Math.min(...durations),
            maxMs: Math.max(...durations),
            recentAvgMs: recent.length > 0 ? Math.round(recentSum / recent.length) : 0,
        };
    }
    getAllStats() {
        const operations = new Set(this.entries.map(e => e.operation));
        const stats = {};
        for (const op of operations) {
            stats[op] = this.getStats(op);
        }
        return stats;
    }
    reset() {
        this.entries = [];
        this.active.clear();
    }
}
exports.perfMonitor = new PerfMonitor();
//# sourceMappingURL=perf-monitor.js.map