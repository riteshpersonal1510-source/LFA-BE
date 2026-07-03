"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailDiscoveryQueue = exports.EmailDiscoveryQueue = void 0;
const logger_1 = require("../utils/logger");
class EmailDiscoveryQueue {
    constructor(maxConcurrent = 10) {
        this.queue = new Map();
        this.running = new Set();
        this.maxConcurrent = maxConcurrent;
    }
    enqueue(leadId, callback) {
        if (this.queue.has(leadId) || this.running.has(leadId))
            return;
        this.queue.set(leadId, { leadId, callback });
        this.processNext();
    }
    processNext() {
        if (this.running.size >= this.maxConcurrent)
            return;
        if (this.queue.size === 0)
            return;
        for (const [leadId, job] of this.queue) {
            if (this.running.size >= this.maxConcurrent)
                break;
            if (this.running.has(leadId))
                continue;
            this.queue.delete(leadId);
            this.running.add(leadId);
            job.callback()
                .catch((err) => {
                logger_1.logger.error({ leadId, err: err instanceof Error ? err.message : String(err) }, 'EmailDiscoveryQueue: Job failed');
            })
                .finally(() => {
                this.running.delete(leadId);
                this.processNext();
            });
        }
    }
    get pendingCount() {
        return this.queue.size;
    }
    get runningCount() {
        return this.running.size;
    }
}
exports.EmailDiscoveryQueue = EmailDiscoveryQueue;
exports.emailDiscoveryQueue = new EmailDiscoveryQueue(10);
//# sourceMappingURL=email-discovery-queue.service.js.map