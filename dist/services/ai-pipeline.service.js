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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiPipelineService = exports.AIPipelineService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const Lead_1 = require("../models/Lead");
const logger_1 = require("../utils/logger");
const responsive_audit_service_1 = require("./responsive-audit.service");
const business_intelligence_service_1 = require("./business-intelligence.service");
const sales_intelligence_service_1 = require("./sales-intelligence.service");
const outreach_service_1 = require("./outreach.service");
const PIPELINE_STEPS = [
    { name: 'Responsive Audit', field: 'responsiveAuditReady' },
    { name: 'Business Intelligence', field: 'intelligenceReady' },
    { name: 'Sales Intelligence', field: 'salesAIReady' },
    { name: 'Outreach Generation', field: 'outreachReady' },
    { name: 'Report Generation', field: 'reportReady' },
];
function computeWebsiteHash(website) {
    if (!website)
        return '';
    return crypto_1.default.createHash('md5').update(website.toLowerCase().trim()).digest('hex');
}
class AIPipelineService {
    async runPipeline(leadId) {
        const errors = [];
        try {
            const lead = await Lead_1.Lead.findById(leadId).lean();
            if (!lead) {
                return { success: false, errors: ['Lead not found'] };
            }
            if (lead.aiStatus === 'completed') {
                const currentHash = computeWebsiteHash(lead.website);
                if (currentHash && currentHash === lead.aiWebsiteHash) {
                    logger_1.logger.info(`[AIPipeline] Lead ${leadId} already completed with same website hash, skipping`);
                    return { success: true, errors: [] };
                }
            }
            logger_1.logger.info(`[AIPipeline] Starting pipeline for lead ${leadId} (${lead.companyName})`);
            await Lead_1.Lead.findByIdAndUpdate(leadId, {
                $set: {
                    aiStatus: 'processing',
                    aiProgress: 0,
                    aiCurrentStep: 'Initializing',
                    aiCurrentStepIndex: 0,
                    aiTotalSteps: PIPELINE_STEPS.length,
                    processingStartedAt: new Date(),
                    aiError: null,
                },
            });
            const totalSteps = PIPELINE_STEPS.length;
            for (let i = 0; i < totalSteps; i++) {
                const step = PIPELINE_STEPS[i];
                const progress = Math.round(((i) / totalSteps) * 100);
                try {
                    await Lead_1.Lead.findByIdAndUpdate(leadId, {
                        $set: {
                            aiCurrentStep: step.name,
                            aiCurrentStepIndex: i,
                            aiProgress: progress,
                        },
                    });
                    logger_1.logger.info(`[AIPipeline] Step ${i + 1}/${totalSteps}: ${step.name} for lead ${leadId}`);
                    switch (step.name) {
                        case 'Responsive Audit':
                            await responsive_audit_service_1.responsiveAuditService.auditLead(leadId);
                            await Lead_1.Lead.findByIdAndUpdate(leadId, {
                                $set: { responsiveAuditReady: true },
                            });
                            break;
                        case 'Business Intelligence':
                            await business_intelligence_service_1.businessIntelligenceService.analyzeLead(leadId);
                            await Lead_1.Lead.findByIdAndUpdate(leadId, {
                                $set: { intelligenceReady: true },
                            });
                            break;
                        case 'Sales Intelligence':
                            await sales_intelligence_service_1.salesIntelligenceService.analyzeLead(leadId);
                            await Lead_1.Lead.findByIdAndUpdate(leadId, {
                                $set: { salesAIReady: true },
                            });
                            break;
                        case 'Outreach Generation':
                            await outreach_service_1.outreachService.generateOutreachForLead(leadId);
                            await Lead_1.Lead.findByIdAndUpdate(leadId, {
                                $set: { outreachReady: true },
                            });
                            break;
                        case 'Report Generation':
                            try {
                                const { reportService } = await Promise.resolve().then(() => __importStar(require('../modules/reports/report.service')));
                                await reportService.generateReport(leadId);
                            }
                            catch (reportErr) {
                                const reportMsg = reportErr instanceof Error ? reportErr.message : String(reportErr);
                                logger_1.logger.warn({ err: reportMsg, leadId }, '[AIPipeline] Report generation failed (non-blocking)');
                            }
                            await Lead_1.Lead.findByIdAndUpdate(leadId, {
                                $set: { reportReady: true, reportGenerated: true },
                            });
                            break;
                    }
                    logger_1.logger.info(`[AIPipeline] Step ${i + 1}/${totalSteps}: ${step.name} completed for lead ${leadId}`);
                }
                catch (stepErr) {
                    const stepMsg = stepErr instanceof Error ? stepErr.message : 'Unknown error';
                    const errorMsg = `Step ${i + 1} (${step.name}): ${stepMsg}`;
                    errors.push(errorMsg);
                    logger_1.logger.warn({ err: stepMsg, leadId, step: step.name }, `[AIPipeline] Step failed (continuing): ${step.name}`);
                }
            }
            const websiteDoc = await Lead_1.Lead.findById(leadId).select('website').lean();
            const finalHash = websiteDoc ? computeWebsiteHash(websiteDoc.website) : '';
            await Lead_1.Lead.findByIdAndUpdate(leadId, {
                $set: {
                    aiStatus: errors.length === PIPELINE_STEPS.length ? 'failed' : 'completed',
                    aiProgress: 100,
                    aiCurrentStep: errors.length > 0 ? 'Completed with errors' : 'Completed',
                    processingCompletedAt: new Date(),
                    lastAuditAt: new Date(),
                    aiWebsiteHash: finalHash || undefined,
                },
            });
            logger_1.logger.info({
                leadId,
                companyName: lead.companyName,
                totalSteps,
                errors: errors.length,
                success: errors.length < PIPELINE_STEPS.length,
            }, '[AIPipeline] Pipeline finished');
            return { success: errors.length < PIPELINE_STEPS.length, errors };
        }
        catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            logger_1.logger.error({ err: errMsg, leadId }, '[AIPipeline] Fatal pipeline error');
            try {
                await Lead_1.Lead.findByIdAndUpdate(leadId, {
                    $set: {
                        aiStatus: 'failed',
                        aiError: errMsg,
                        processingCompletedAt: new Date(),
                    },
                });
            }
            catch {
            }
            return { success: false, errors: [errMsg] };
        }
    }
}
exports.AIPipelineService = AIPipelineService;
exports.aiPipelineService = new AIPipelineService();
//# sourceMappingURL=ai-pipeline.service.js.map