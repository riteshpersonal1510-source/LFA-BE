"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.megaAIController = void 0;
const mega_ai_orchestrator_1 = require("../mega-ai-engine/mega-ai-orchestrator");
const ai_processing_queue_service_1 = require("../services/ai-processing-queue.service");
const Lead_1 = require("../models/Lead");
const api_response_1 = require("../utils/api-response");
const logger_1 = require("../utils/logger");
const website_analysis_service_1 = require("../services/website-analysis.service");
exports.megaAIController = {
    analyzeLead(req, res) {
        try {
            const { leadId } = req.params;
            ai_processing_queue_service_1.aiProcessingQueue.enqueueLead(leadId).catch((err) => {
                logger_1.logger.error({ err: err instanceof Error ? err.message : String(err), leadId }, 'MEGA AI background pipeline failed');
            });
            api_response_1.APIResponse.success(res, {
                leadId,
                status: 'queued',
                message: 'Full AI pipeline has been queued. Results will be available shortly.',
            }, 'Pipeline queued');
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Pipeline queue failed';
            api_response_1.APIResponse.error(res, msg, null, 500);
        }
    },
    analyzeMultipleLeads(req, res) {
        try {
            const { leadIds } = req.body;
            if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
                api_response_1.APIResponse.error(res, 'leadIds array is required', null, 400);
                return;
            }
            ai_processing_queue_service_1.aiProcessingQueue.enqueueMultiple(leadIds);
            api_response_1.APIResponse.success(res, {
                queued: leadIds.length,
                status: 'queued',
                message: `${leadIds.length} leads queued for full pipeline analysis.`,
            }, 'Batch pipeline queued');
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Batch pipeline queue failed';
            api_response_1.APIResponse.error(res, msg, null, 500);
        }
    },
    async analyzePendingLeads(req, res) {
        try {
            const body = req.body;
            const limit = body.limit || 50;
            const count = await ai_processing_queue_service_1.aiProcessingQueue.enqueueAllPendingLeads(limit);
            api_response_1.APIResponse.success(res, {
                enqueued: count,
                status: 'queued',
                message: `${count} pending leads queued for analysis.`,
            }, 'Pending analysis queued');
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Failed to queue pending analysis';
            api_response_1.APIResponse.error(res, msg, null, 500);
        }
    },
    async getPipelineStats(_req, res) {
        try {
            const stats = await mega_ai_orchestrator_1.megaAIOrchestrator.getPipelineStats();
            api_response_1.APIResponse.success(res, stats, 'Pipeline stats retrieved');
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Failed to get stats';
            api_response_1.APIResponse.error(res, msg, null, 500);
        }
    },
    async getLeadAIStatus(req, res) {
        try {
            const { leadId } = req.params;
            const lead = await Lead_1.Lead.findById(leadId).select('aiStatus aiProgress aiCurrentStep aiCurrentStepIndex aiTotalSteps aiError ' +
                'processingStartedAt processingCompletedAt lastAuditAt reportGenerated ' +
                'responsiveAuditReady intelligenceReady outreachReady salesAIReady reportReady ' +
                'responsiveAuditCompleted intelligenceCompleted salesIntelligenceCompleted outreachCompleted ' +
                'aiWebsiteHash website').lean();
            if (!lead) {
                api_response_1.APIResponse.error(res, 'Lead not found', null, 404);
                return;
            }
            const queueStatus = ai_processing_queue_service_1.aiProcessingQueue.getStatus();
            const leadRecord = lead;
            const leadIdStr = String(leadRecord._id);
            api_response_1.APIResponse.success(res, {
                id: leadIdStr,
                aiStatus: leadRecord.aiStatus,
                aiProgress: leadRecord.aiProgress,
                aiCurrentStep: leadRecord.aiCurrentStep,
                aiCurrentStepIndex: leadRecord.aiCurrentStepIndex,
                aiTotalSteps: leadRecord.aiTotalSteps,
                aiError: leadRecord.aiError,
                processingStartedAt: leadRecord.processingStartedAt,
                processingCompletedAt: leadRecord.processingCompletedAt,
                lastAuditAt: leadRecord.lastAuditAt,
                reportGenerated: leadRecord.reportGenerated,
                responsiveAuditReady: leadRecord.responsiveAuditReady,
                intelligenceReady: leadRecord.intelligenceReady,
                outreachReady: leadRecord.outreachReady,
                salesAIReady: leadRecord.salesAIReady,
                reportReady: leadRecord.reportReady,
                responsiveAuditCompleted: leadRecord.responsiveAuditCompleted,
                intelligenceCompleted: leadRecord.intelligenceCompleted,
                salesIntelligenceCompleted: leadRecord.salesIntelligenceCompleted,
                outreachCompleted: leadRecord.outreachCompleted,
                aiWebsiteHash: leadRecord.aiWebsiteHash,
                website: leadRecord.website,
                queueStatus,
            }, 'AI status retrieved');
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Failed to get AI status';
            api_response_1.APIResponse.error(res, msg, null, 500);
        }
    },
    async refreshAnalysis(req, res) {
        try {
            const { leadId } = req.params;
            const lead = await Lead_1.Lead.findById(leadId).select('aiStatus website').lean();
            if (!lead) {
                api_response_1.APIResponse.error(res, 'Lead not found', null, 404);
                return;
            }
            const leadRecord = lead;
            const aiStatus = leadRecord.aiStatus;
            if (aiStatus === 'processing' || aiStatus === 'queued') {
                api_response_1.APIResponse.error(res, 'Analysis is already running for this lead', null, 409);
                return;
            }
            const website = leadRecord.website;
            const analysis = website_analysis_service_1.websiteAnalysisService.analyze(website);
            await Lead_1.Lead.findByIdAndUpdate(leadId, {
                $set: {
                    analysisEligible: analysis.analysisEligible,
                    normalizedDomain: analysis.normalizedDomain,
                    hasWebsite: analysis.hasWebsite,
                    hasRealWebsite: analysis.analysisEligible,
                },
            });
            if (!analysis.analysisEligible) {
                logger_1.logger.info(`[MegaAIController] Refresh skipped for lead ${leadId} — analysisEligible is false`);
                api_response_1.APIResponse.success(res, {
                    leadId,
                    status: 'skipped',
                    message: 'Lead has no standalone website — analysis not applicable.',
                }, 'Refresh skipped');
                return;
            }
            ai_processing_queue_service_1.aiProcessingQueue.enqueueLead(leadId).catch((err) => {
                logger_1.logger.error({ err: err instanceof Error ? err.message : String(err), leadId }, 'Refresh analysis enqueue failed');
            });
            api_response_1.APIResponse.success(res, {
                leadId,
                status: 'queued',
                message: 'Analysis refresh has been queued.',
            }, 'Analysis refresh queued');
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Failed to queue refresh';
            api_response_1.APIResponse.error(res, msg, null, 500);
        }
    },
};
//# sourceMappingURL=mega-ai.controller.js.map