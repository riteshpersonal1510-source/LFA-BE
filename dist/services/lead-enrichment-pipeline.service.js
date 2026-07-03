"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadEnrichmentPipeline = exports.LeadEnrichmentPipeline = void 0;
const Lead_1 = require("../models/Lead");
const logger_1 = require("../utils/logger");
const website_intelligence_engine_service_1 = require("./website-intelligence-engine.service");
const business_email_discovery_service_1 = require("./business-email-discovery.service");
const responsive_audit_service_1 = require("./responsive-audit.service");
const business_intelligence_service_1 = require("./business-intelligence.service");
const sales_intelligence_service_1 = require("./sales-intelligence.service");
const outreach_service_1 = require("./outreach.service");
const report_service_1 = require("../modules/reports/report.service");
const ai_analysis_engine_service_1 = require("./ai-analysis-engine.service");
const socket_manager_1 = require("../modules/automation-monitor/socket-manager");
const crypto_1 = __importDefault(require("crypto"));
const ENRICHMENT_STEPS = [
    {
        id: 'website_intelligence',
        name: 'Website Intelligence',
        run: async (leadId) => {
            const lead = await Lead_1.Lead.findById(leadId).select('hasWebsite website companyName').lean();
            if (!lead || !lead.hasWebsite || !lead.website)
                return false;
            await website_intelligence_engine_service_1.websiteIntelligenceEngine.processLead(leadId, lead.website);
            return true;
        },
    },
    {
        id: 'email_discovery',
        name: 'Email Discovery',
        run: async (leadId) => {
            const lead = await Lead_1.Lead.findById(leadId).select('hasWebsite website').lean();
            if (!lead || !lead.hasWebsite || !lead.website)
                return false;
            const result = await business_email_discovery_service_1.businessEmailDiscoveryService.discoverEmailsForLead(leadId);
            return result.success;
        },
    },
    {
        id: 'responsive_audit',
        name: 'Responsive Audit',
        run: async (leadId) => {
            const result = await responsive_audit_service_1.responsiveAuditService.auditLead(leadId);
            return result !== null;
        },
    },
    {
        id: 'business_intelligence',
        name: 'Business Intelligence',
        run: async (leadId) => {
            const result = await business_intelligence_service_1.businessIntelligenceService.analyzeLead(leadId);
            return result !== null;
        },
    },
    {
        id: 'sales_intelligence',
        name: 'Sales Intelligence',
        run: async (leadId) => {
            const result = await sales_intelligence_service_1.salesIntelligenceService.analyzeLead(leadId);
            return result !== null;
        },
    },
    {
        id: 'outreach',
        name: 'Outreach Generation',
        run: async (leadId) => {
            await outreach_service_1.outreachService.generateOutreachForLead(leadId);
            return true;
        },
    },
    {
        id: 'report',
        name: 'Report Generation',
        run: async (leadId) => {
            const result = await report_service_1.reportService.generateReport(leadId);
            return result.success;
        },
    },
    {
        id: 'ai_analysis',
        name: 'AI Analysis',
        run: async (leadId) => {
            ai_analysis_engine_service_1.aiAnalysisEngine.enqueueAnalysis(leadId);
            return true;
        },
    },
];
class LeadEnrichmentPipeline {
    constructor() {
        this.activeEnrichments = new Set();
        this.maxConcurrent = 5;
    }
    async enqueueLead(leadId, force = false) {
        if (this.activeEnrichments.has(leadId)) {
            logger_1.logger.debug(`[Enrichment] Lead ${leadId} already being enriched, skipping`);
            return;
        }
        const lead = await Lead_1.Lead.findById(leadId)
            .select('enrichmentStatus website hasWebsite enrichmentCompletedAt enrichmentError')
            .lean();
        if (!lead) {
            logger_1.logger.warn({ leadId }, '[Enrichment] Lead not found, skipping');
            return;
        }
        if (lead.enrichmentStatus === 'completed' && !force) {
            logger_1.logger.debug(`[Enrichment] Lead ${leadId} already enriched, skipping`);
            return;
        }
        this.activeEnrichments.add(leadId);
        setImmediate(() => {
            this.runPipeline(leadId, force).finally(() => {
                this.activeEnrichments.delete(leadId);
            });
        });
    }
    enqueueMultiple(leadIds, force = false) {
        for (const leadId of leadIds) {
            if (this.activeEnrichments.size >= this.maxConcurrent) {
                logger_1.logger.debug(`[Enrichment] Max concurrent enrichments reached (${this.maxConcurrent}), delaying ${leadId}`);
                setImmediate(() => this.enqueueLead(leadId, force));
            }
            else {
                this.enqueueLead(leadId, force);
            }
        }
    }
    async runPipeline(leadId, _force) {
        const startTime = Date.now();
        const errors = [];
        let completedSteps = 0;
        const totalSteps = ENRICHMENT_STEPS.length;
        try {
            await Lead_1.Lead.findByIdAndUpdate(leadId, {
                $set: {
                    enrichmentStatus: 'running',
                    enrichmentStartedAt: new Date(),
                    enrichmentCompletedAt: null,
                    enrichmentError: null,
                    enrichmentProgress: 0,
                    enrichmentCurrentStep: 'Starting enrichment',
                },
            });
            (0, socket_manager_1.emitLeadEnrichmentStarted)(leadId);
            const PHASE1_IDS = new Set(['website_intelligence', 'email_discovery', 'responsive_audit']);
            const phase1Steps = ENRICHMENT_STEPS.filter((s) => PHASE1_IDS.has(s.id));
            const phase2Steps = ENRICHMENT_STEPS.filter((s) => !PHASE1_IDS.has(s.id));
            const runStep = async (step, i) => {
                const progress = Math.round((i / totalSteps) * 100);
                await Lead_1.Lead.findByIdAndUpdate(leadId, {
                    $set: { enrichmentCurrentStep: step.name, enrichmentProgress: progress },
                });
                (0, socket_manager_1.emitLeadEnrichmentStep)(leadId, { step: step.id, stepIndex: i, totalSteps, progress, status: 'running' });
                try {
                    logger_1.logger.info(`[Enrichment] Step ${i + 1}/${totalSteps}: ${step.name} for lead ${leadId}`);
                    const success = await step.run(leadId);
                    completedSteps++;
                    const doneProgress = Math.round(((i + 1) / totalSteps) * 100);
                    (0, socket_manager_1.emitLeadEnrichmentStep)(leadId, {
                        step: step.id,
                        stepIndex: i,
                        totalSteps,
                        progress: doneProgress,
                        status: success ? 'completed' : 'skipped',
                    });
                    logger_1.logger.info(`[Enrichment] Step ${i + 1}/${totalSteps}: ${step.name} ${success ? 'completed' : 'skipped'} for lead ${leadId}`);
                }
                catch (stepErr) {
                    const stepMsg = stepErr instanceof Error ? stepErr.message : String(stepErr);
                    errors.push(`Step ${i + 1} (${step.name}): ${stepMsg}`);
                    completedSteps++;
                    (0, socket_manager_1.emitLeadEnrichmentStep)(leadId, {
                        step: step.id, stepIndex: i, totalSteps,
                        progress: Math.round(((i + 1) / totalSteps) * 100),
                        status: 'failed', error: stepMsg,
                    });
                    logger_1.logger.warn({ err: stepMsg, leadId, step: step.name }, `[Enrichment] Step failed (continuing): ${step.name}`);
                }
            };
            logger_1.logger.info({ leadId, phase1: phase1Steps.map(s => s.id) }, '[Enrichment] Phase 1 parallel start');
            await Promise.allSettled(phase1Steps.map((step, i) => runStep(step, i)));
            logger_1.logger.info({ leadId }, '[Enrichment] Phase 1 completed — starting Phase 2 sequential');
            for (let i = 0; i < phase2Steps.length; i++) {
                await runStep(phase2Steps[i], phase1Steps.length + i);
            }
            const duration = Date.now() - startTime;
            const finalStatus = errors.length === totalSteps ? 'failed' : 'completed';
            const websiteDoc = await Lead_1.Lead.findById(leadId).select('website').lean();
            const website = websiteDoc?.website;
            const aiWebsiteHash = website ? this.computeWebsiteHash(website) : '';
            await Lead_1.Lead.findByIdAndUpdate(leadId, {
                $set: {
                    enrichmentStatus: finalStatus,
                    enrichmentCompletedAt: new Date(),
                    enrichmentProgress: 100,
                    enrichmentCurrentStep: errors.length > 0 ? 'Completed with errors' : 'Completed',
                    aiWebsiteHash: aiWebsiteHash || undefined,
                },
            });
            if (finalStatus === 'completed') {
                (0, socket_manager_1.emitLeadEnrichmentCompleted)(leadId, { duration, totalSteps, errors: errors.length });
            }
            else {
                (0, socket_manager_1.emitLeadEnrichmentFailed)(leadId, { error: errors.join('; '), duration, completedSteps, totalSteps });
            }
            logger_1.logger.info({ leadId, duration, totalSteps, completedSteps, errors: errors.length, status: finalStatus }, '[Enrichment] Pipeline finished');
        }
        catch (pipelineErr) {
            const errMsg = pipelineErr instanceof Error ? pipelineErr.message : String(pipelineErr);
            logger_1.logger.error({ err: errMsg, leadId }, '[Enrichment] Fatal pipeline error');
            try {
                await Lead_1.Lead.findByIdAndUpdate(leadId, {
                    $set: {
                        enrichmentStatus: 'failed',
                        enrichmentCompletedAt: new Date(),
                        enrichmentProgress: Math.round((completedSteps / totalSteps) * 100),
                        enrichmentError: errMsg,
                    },
                });
            }
            catch {
            }
            (0, socket_manager_1.emitLeadEnrichmentFailed)(leadId, {
                error: errMsg,
                duration: Date.now() - startTime,
                completedSteps,
                totalSteps,
            });
        }
    }
    getStatus() {
        return {
            activeCount: this.activeEnrichments.size,
            maxConcurrent: this.maxConcurrent,
        };
    }
    computeWebsiteHash(website) {
        if (!website)
            return '';
        return crypto_1.default.createHash('md5').update(website.toLowerCase().trim()).digest('hex');
    }
}
exports.LeadEnrichmentPipeline = LeadEnrichmentPipeline;
exports.leadEnrichmentPipeline = new LeadEnrichmentPipeline();
//# sourceMappingURL=lead-enrichment-pipeline.service.js.map