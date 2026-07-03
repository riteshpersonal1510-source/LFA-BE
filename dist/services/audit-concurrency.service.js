"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditConcurrency = exports.AuditConcurrencyService = void 0;
const logger_1 = require("../utils/logger");
class AuditConcurrencyService {
    constructor() {
        this.MAX_CONCURRENT = 2;
        this.activeCount = 0;
        this.queue = [];
        this.processing = false;
    }
    static getInstance() {
        if (!AuditConcurrencyService.instance) {
            AuditConcurrencyService.instance = new AuditConcurrencyService();
        }
        return AuditConcurrencyService.instance;
    }
    async enqueue(id, type, execute) {
        return new Promise((resolve, reject) => {
            const task = {
                id,
                type,
                execute: execute,
                resolve: resolve,
                reject,
            };
            this.queue.push(task);
            logger_1.logger.info({ type, id, queueLength: this.queue.length, activeCount: this.activeCount }, `[AuditQueue] Enqueued ${type} for ${id}`);
            if (!this.processing) {
                this.processNext();
            }
        });
    }
    async processNext() {
        this.processing = true;
        while (this.queue.length > 0 && this.activeCount < this.MAX_CONCURRENT) {
            const task = this.queue.shift();
            if (!task)
                break;
            this.activeCount++;
            task.startTime = Date.now();
            logger_1.logger.info({ type: task.type, id: task.id, activeCount: this.activeCount }, `[AuditQueue] Starting ${task.type}`);
            this.executeTask(task).finally(() => {
                this.activeCount--;
                const duration = Date.now() - (task.startTime || Date.now());
                logger_1.logger.info({ type: task.type, id: task.id, duration, activeCount: this.activeCount }, `[AuditQueue] Completed ${task.type}`);
                setImmediate(() => this.processNext());
            });
        }
        this.processing = this.queue.length > 0 || this.activeCount > 0;
    }
    async executeTask(task) {
        try {
            const result = await task.execute();
            task.resolve(result);
        }
        catch (err) {
            logger_1.logger.error({ err: err instanceof Error ? err.message : String(err), type: task.type, id: task.id }, `[AuditQueue] Task ${task.type} failed`);
            task.reject(err);
        }
    }
    getStatus() {
        return {
            activeCount: this.activeCount,
            queueLength: this.queue.length,
            maxConcurrent: this.MAX_CONCURRENT,
        };
    }
}
exports.AuditConcurrencyService = AuditConcurrencyService;
exports.auditConcurrency = AuditConcurrencyService.getInstance();
//# sourceMappingURL=audit-concurrency.service.js.map