"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportQueue = exports.ReportQueue = void 0;
const events_1 = require("events");
const logger_1 = require("../../utils/logger");
const report_service_1 = require("./report.service");
class ReportQueue extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.queue = new Map();
        this.processing = false;
    }
    async enqueue(leadId) {
        const existing = this.queue.get(leadId);
        if (existing) {
            logger_1.logger.info({ leadId }, '[ReportQueue] Already queued, skipping duplicate');
            return existing;
        }
        return new Promise((resolve, reject) => {
            this.queue.set(leadId, { leadId, resolve, reject });
            logger_1.logger.info({ leadId, queueSize: this.queue.size }, '[ReportQueue] Enqueued report generation');
            this.processNext();
        });
    }
    async processNext() {
        if (this.processing || this.queue.size === 0)
            return;
        this.processing = true;
        const entry = this.queue.values().next().value;
        if (!entry) {
            this.processing = false;
            return;
        }
        this.queue.delete(entry.leadId);
        try {
            logger_1.logger.info({ leadId: entry.leadId }, '[ReportQueue] Processing report');
            this.emit('progress', { leadId: entry.leadId, stage: 'generating', percent: 10, message: 'Generating report...' });
            const result = await report_service_1.reportService.generateReport(entry.leadId);
            this.emit('progress', { leadId: entry.leadId, stage: 'complete', percent: 100, message: 'Report generated' });
            entry.resolve(result);
        }
        catch (error) {
            logger_1.logger.error({ err: error instanceof Error ? error.message : String(error), leadId: entry.leadId }, '[ReportQueue] Generation failed');
            this.emit('progress', { leadId: entry.leadId, stage: 'error', percent: 0, message: 'Generation failed' });
            entry.reject(error);
        }
        finally {
            this.processing = false;
            setImmediate(() => this.processNext());
        }
    }
    isQueued(leadId) {
        return this.queue.has(leadId);
    }
    getQueueSize() {
        return this.queue.size;
    }
}
exports.ReportQueue = ReportQueue;
exports.reportQueue = new ReportQueue();
//# sourceMappingURL=report.queue.js.map