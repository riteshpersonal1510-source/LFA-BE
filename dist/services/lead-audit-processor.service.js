"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadAuditProcessor = exports.LeadAuditProcessor = void 0;
const Lead_1 = require("../models/Lead");
const logger_1 = require("../utils/logger");
const responsive_audit_service_1 = require("./responsive-audit.service");
const business_intelligence_service_1 = require("./business-intelligence.service");
const browser_pool_service_1 = require("./browser-pool.service");
const p_limit_1 = __importDefault(require("p-limit"));
class LeadAuditProcessor {
    constructor() {
        this.maxConcurrent = 3;
        this.limit = (0, p_limit_1.default)(this.maxConcurrent);
        this.queue = [];
        this.processing = false;
        this.totalEnqueued = 0;
        this.totalCompleted = 0;
        this.results = [];
    }
    enqueueLead(leadId, website) {
        this.queue.push({ leadId, website });
        this.totalEnqueued++;
        logger_1.logger.info(`[LeadAuditProcessor] Enqueued lead ${leadId} (total: ${this.totalEnqueued})`);
        if (!this.processing) {
            void this.processQueue();
        }
    }
    enqueueMany(leadIds) {
        const batch = leadIds.slice(0, 10);
        for (const item of batch) {
            this.queue.push(item);
            this.totalEnqueued++;
        }
        logger_1.logger.info(`[LeadAuditProcessor] Enqueued ${batch.length} leads (total: ${this.totalEnqueued})`);
        if (!this.processing) {
            void this.processQueue();
        }
    }
    async processQueue() {
        if (this.processing)
            return;
        this.processing = true;
        logger_1.logger.info(`[LeadAuditProcessor] Starting queue processing with ${this.queue.length} leads`);
        while (this.queue.length > 0) {
            const batch = this.queue.splice(0, 10);
            const processPromises = batch.map(item => this.limit(() => this.processSingleLead(item)));
            const batchResults = await Promise.allSettled(processPromises);
            for (const result of batchResults) {
                if (result.status === 'fulfilled') {
                    this.results.push(result.value);
                }
            }
            this.totalCompleted += batch.length;
            logger_1.logger.info(`[LeadAuditProcessor] Completed ${this.totalCompleted}/${this.totalEnqueued} leads`);
        }
        this.processing = false;
        logger_1.logger.info(`[LeadAuditProcessor] Queue processing complete (${this.totalCompleted}/${this.totalEnqueued})`);
        await browser_pool_service_1.browserPool.shutdown();
    }
    async processSingleLead(item) {
        const { leadId } = item;
        const result = { leadId, responsiveSuccess: false, intelligenceSuccess: false };
        try {
            await Lead_1.Lead.findByIdAndUpdate(leadId, {
                $set: {
                    'auditStatus.responsive': 'running',
                    'auditStatus.intelligence': 'running',
                    'auditStatus.overall': 'running',
                },
            });
            const [auditResult, intelligenceResult] = await Promise.allSettled([
                responsive_audit_service_1.responsiveAuditService.auditLead(leadId).catch(err => {
                    logger_1.logger.error(err, `[LeadAuditProcessor] Responsive audit failed for ${leadId}`);
                    return null;
                }),
                business_intelligence_service_1.businessIntelligenceService.analyzeLead(leadId).catch(err => {
                    logger_1.logger.error(err, `[LeadAuditProcessor] Intelligence analysis failed for ${leadId}`);
                    return null;
                }),
            ]);
            const responsiveSuccess = auditResult.status === 'fulfilled' && auditResult.value !== null;
            const intelligenceSuccess = intelligenceResult.status === 'fulfilled' && intelligenceResult.value !== null;
            result.responsiveSuccess = responsiveSuccess;
            result.intelligenceSuccess = intelligenceSuccess;
            const responsiveAuditValue = responsiveSuccess ? 'completed' : 'failed';
            const intelligenceAuditValue = intelligenceSuccess ? 'completed' : 'failed';
            const overallAuditValue = responsiveSuccess && intelligenceSuccess ? 'completed' : 'failed';
            await Lead_1.Lead.findByIdAndUpdate(leadId, {
                $set: {
                    'auditStatus.responsive': responsiveAuditValue,
                    'auditStatus.intelligence': intelligenceAuditValue,
                    'auditStatus.overall': overallAuditValue,
                },
            });
            logger_1.logger.info(`[LeadAuditProcessor] Processed lead ${leadId}: responsive=${responsiveAuditValue}, intelligence=${intelligenceAuditValue}`);
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            result.error = errorMsg;
            logger_1.logger.error(error instanceof Error ? error : new Error(errorMsg), `[LeadAuditProcessor] Failed to process lead ${leadId}`);
            await Lead_1.Lead.findByIdAndUpdate(leadId, {
                $set: {
                    'auditStatus.responsive': 'failed',
                    'auditStatus.intelligence': 'failed',
                    'auditStatus.overall': 'failed',
                },
            }).catch(() => { });
        }
        return result;
    }
    getQueueStats() {
        return {
            enqueued: this.totalEnqueued,
            completed: this.totalCompleted,
            pending: this.queue.length,
            processing: this.processing,
        };
    }
}
exports.LeadAuditProcessor = LeadAuditProcessor;
exports.leadAuditProcessor = new LeadAuditProcessor();
//# sourceMappingURL=lead-audit-processor.service.js.map