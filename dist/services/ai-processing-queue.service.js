"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiProcessingQueue = exports.AIProcessingQueue = void 0;
const crypto_1 = __importDefault(require("crypto"));
const Lead_1 = require("../models/Lead");
const logger_1 = require("../utils/logger");
const ai_pipeline_service_1 = require("./ai-pipeline.service");
const MAX_CONCURRENT = 3;
class AIProcessingQueue {
    constructor() {
        this.activeCount = 0;
        this.queue = [];
        this.processing = false;
        this.processingSet = new Set();
        this.initialEnqueueDone = false;
    }
    async enqueueLead(leadId) {
        if (this.processingSet.has(leadId)) {
            logger_1.logger.debug(`[AIQueue] Lead ${leadId} already in queue or processing, skipping`);
            return;
        }
        const lead = await Lead_1.Lead.findById(leadId).select('aiStatus aiWebsiteHash website').lean();
        if (!lead)
            return;
        const aiStatus = lead.aiStatus;
        const aiWebsiteHash = lead.aiWebsiteHash;
        const website = lead.website;
        if (aiStatus === 'completed' && aiWebsiteHash) {
            const currentHash = this.computeWebsiteHash(website);
            if (currentHash === aiWebsiteHash) {
                logger_1.logger.debug(`[AIQueue] Lead ${leadId} already completed with same hash, skipping`);
                return;
            }
        }
        this.processingSet.add(leadId);
        this.queue.push({ leadId, enqueuedAt: new Date() });
        await Lead_1.Lead.findByIdAndUpdate(leadId, {
            $set: { aiStatus: 'queued', aiProgress: 0, aiCurrentStep: 'Waiting in queue' },
        });
        logger_1.logger.info(`[AIQueue] Enqueued lead ${leadId} (queue length: ${this.queue.length}, active: ${this.activeCount})`);
        if (!this.processing) {
            void this.processNext();
        }
    }
    enqueueMultiple(leadIds) {
        for (const leadId of leadIds) {
            void this.enqueueLead(leadId);
        }
    }
    async enqueueAllPendingLeads(limit = 50) {
        const pendingLeads = await Lead_1.Lead.find({
            website: { $exists: true, $nin: [null, ''] },
            $or: [
                { aiStatus: { $in: ['pending', null] } },
                { aiStatus: { $exists: false } },
            ],
        })
            .limit(limit)
            .select('_id')
            .lean();
        if (pendingLeads.length === 0) {
            logger_1.logger.info('[AIQueue] No pending leads found for initial enqueue');
            return 0;
        }
        logger_1.logger.info(`[AIQueue] Found ${pendingLeads.length} pending leads for initial enqueue`);
        for (const lead of pendingLeads) {
            const leadRecord = lead;
            void this.enqueueLead(String(leadRecord._id));
        }
        this.initialEnqueueDone = true;
        return pendingLeads.length;
    }
    async enqueuePendingOnStartup() {
        if (this.initialEnqueueDone)
            return;
        await this.enqueueAllPendingLeads(50);
    }
    getStatus() {
        return {
            activeCount: this.activeCount,
            queueLength: this.queue.length,
            maxConcurrent: MAX_CONCURRENT,
        };
    }
    processNext() {
        this.processing = true;
        while (this.queue.length > 0 && this.activeCount < MAX_CONCURRENT) {
            const entry = this.queue.shift();
            if (!entry)
                break;
            this.activeCount++;
            setImmediate(() => {
                void this.executePipeline(entry.leadId).finally(() => {
                    this.activeCount--;
                    this.processingSet.delete(entry.leadId);
                    setImmediate(() => {
                        void this.processNext();
                    });
                });
            });
        }
        this.processing = this.queue.length > 0 || this.activeCount > 0;
    }
    async executePipeline(leadId) {
        try {
            logger_1.logger.info(`[AIQueue] Starting pipeline for lead ${leadId}`);
            const result = await ai_pipeline_service_1.aiPipelineService.runPipeline(leadId);
            if (!result.success) {
                logger_1.logger.warn({ leadId, errors: result.errors }, '[AIQueue] Pipeline completed with errors');
            }
            else {
                logger_1.logger.info(`[AIQueue] Pipeline completed successfully for lead ${leadId}`);
            }
        }
        catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            logger_1.logger.error({ err: errMsg, leadId }, '[AIQueue] Pipeline execution failed');
            try {
                await Lead_1.Lead.findByIdAndUpdate(leadId, {
                    $set: { aiStatus: 'failed', aiError: errMsg, processingCompletedAt: new Date() },
                });
            }
            catch {
            }
        }
    }
    computeWebsiteHash(website) {
        if (!website)
            return '';
        return crypto_1.default.createHash('md5').update(website.toLowerCase().trim()).digest('hex');
    }
}
exports.AIProcessingQueue = AIProcessingQueue;
exports.aiProcessingQueue = new AIProcessingQueue();
//# sourceMappingURL=ai-processing-queue.service.js.map