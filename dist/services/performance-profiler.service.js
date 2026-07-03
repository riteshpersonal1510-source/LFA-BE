"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profiler = exports.PerformanceProfiler = void 0;
const logger_1 = require("../utils/logger");
class PerformanceProfiler {
    constructor() {
        this.entries = [];
        this.current = null;
    }
    start(name, metadata) {
        this.current = { name, startTime: Date.now(), metadata };
    }
    end() {
        if (!this.current)
            return 0;
        this.current.endTime = Date.now();
        this.current.duration = this.current.endTime - this.current.startTime;
        this.entries.push(this.current);
        const duration = this.current.duration;
        logger_1.logger.debug({ name: this.current.name, duration, ...this.current.metadata }, `[Profiler] ${this.current.name} took ${duration}ms`);
        this.current = null;
        return duration;
    }
    getEntries() {
        return [...this.entries];
    }
    clear() {
        this.entries = [];
        this.current = null;
    }
    getLast() {
        return this.entries.length > 0 ? this.entries[this.entries.length - 1] : null;
    }
    summary() {
        const grouped = {};
        for (const entry of this.entries) {
            if (!entry.duration)
                continue;
            if (!grouped[entry.name])
                grouped[entry.name] = [];
            grouped[entry.name].push(entry.duration);
        }
        const result = {};
        for (const [name, durations] of Object.entries(grouped)) {
            const total = durations.reduce((a, b) => a + b, 0);
            result[name] = {
                count: durations.length,
                total,
                avg: Math.round(total / durations.length),
                max: Math.max(...durations),
            };
        }
        return result;
    }
}
exports.PerformanceProfiler = PerformanceProfiler;
exports.profiler = new PerformanceProfiler();
//# sourceMappingURL=performance-profiler.service.js.map