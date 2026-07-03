"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackgroundEnrichmentWorker = void 0;
const logger_1 = require("../utils/logger");
const socket_manager_1 = require("../modules/automation-monitor/socket-manager");
const ENRICHMENT_CONCURRENCY = 2;
const POLL_INTERVAL_MS = 1000;
class BackgroundEnrichmentWorker {
    constructor() {
        this.queue = [];
        this.processing = new Set();
        this.running = false;
        this.activeCount = 0;
    }
    start() {
        if (this.running)
            return;
        this.running = true;
        this.processLoop();
        logger_1.logger.info('BackgroundEnrichmentWorker: Started');
    }
    stop() {
        this.running = false;
        logger_1.logger.info('BackgroundEnrichmentWorker: Stopped');
    }
    enqueue(task) {
        if (this.processing.has(task.leadId)) {
            logger_1.logger.debug({ leadId: task.leadId }, 'BackgroundEnrichmentWorker: Already processing, skipping');
            return;
        }
        this.queue.push(task);
        logger_1.logger.info({ leadId: task.leadId, source: task.source, queueSize: this.queue.length }, 'BackgroundEnrichmentWorker: Enqueued');
    }
    enqueueBatch(tasks) {
        for (const task of tasks) {
            this.enqueue(task);
        }
    }
    getQueueSize() {
        return this.queue.length;
    }
    getProcessingCount() {
        return this.activeCount;
    }
    async processLoop() {
        while (this.running) {
            if (this.activeCount < ENRICHMENT_CONCURRENCY && this.queue.length > 0) {
                const task = this.queue.shift();
                if (!this.processing.has(task.leadId)) {
                    this.activeCount++;
                    this.processing.add(task.leadId);
                    this.processTask(task).finally(() => {
                        this.activeCount--;
                        this.processing.delete(task.leadId);
                    });
                }
            }
            if (this.activeCount === 0 && this.queue.length === 0) {
                await this.sleep(POLL_INTERVAL_MS);
            }
            else {
                await this.sleep(100);
            }
        }
    }
    async processTask(task) {
        const startTime = Date.now();
        try {
            (0, socket_manager_1.emitLeadEnrichmentStarted)(task.leadId);
            const { leadEnrichmentOrchestrator } = await Promise.resolve().then(() => __importStar(require('../enrichment')));
            const result = await leadEnrichmentOrchestrator.enrichLead(task.leadId);
            if (result.success) {
                (0, socket_manager_1.emitLeadEnrichmentCompleted)(task.leadId, {
                    duration: Date.now() - startTime,
                    totalSteps: result.fieldsUpdated?.length || 0,
                    errors: result.errors?.length || 0,
                });
                logger_1.logger.info({
                    leadId: task.leadId,
                    duration: Date.now() - startTime,
                    fieldsUpdated: result.fieldsUpdated?.length || 0,
                }, 'BackgroundEnrichmentWorker: Enrichment completed');
            }
            else {
                const errorMsg = result.errors?.length > 0 ? result.errors[0] : 'Unknown enrichment error';
                (0, socket_manager_1.emitLeadEnrichmentFailed)(task.leadId, {
                    error: errorMsg,
                    duration: Date.now() - startTime,
                    completedSteps: result.fieldsUpdated?.length || 0,
                    totalSteps: 0,
                });
                logger_1.logger.error({
                    leadId: task.leadId,
                    error: errorMsg,
                    duration: Date.now() - startTime,
                }, 'BackgroundEnrichmentWorker: Enrichment failed');
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            (0, socket_manager_1.emitLeadEnrichmentFailed)(task.leadId, {
                error: message,
                duration: Date.now() - startTime,
                completedSteps: 0,
                totalSteps: 0,
            });
            logger_1.logger.error({
                leadId: task.leadId,
                error: message,
                duration: Date.now() - startTime,
            }, 'BackgroundEnrichmentWorker: Enrichment threw');
        }
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.BackgroundEnrichmentWorker = BackgroundEnrichmentWorker;
//# sourceMappingURL=background-enrichment.js.map