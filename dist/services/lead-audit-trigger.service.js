"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadAuditTriggerService = exports.LeadAuditTriggerService = void 0;
const Lead_1 = require("../models/Lead");
const logger_1 = require("../utils/logger");
const responsive_audit_service_1 = require("./responsive-audit.service");
const business_intelligence_service_1 = require("./business-intelligence.service");
const website_intelligence_service_1 = require("./website-intelligence.service");
const website_analysis_service_1 = require("./website-analysis.service");
const audit_concurrency_service_1 = require("./audit-concurrency.service");
const p_limit_1 = __importDefault(require("p-limit"));
class LeadAuditTriggerService {
    constructor() {
        this.maxConcurrent = 1;
        this.limit = (0, p_limit_1.default)(this.maxConcurrent);
    }
    async triggerMissingAuditsForLead(leadId, waitForCompletion = true) {
        const result = {
            leadId,
            responsiveAuditTriggered: false,
            businessIntelligenceTriggered: false,
            websiteIntelligenceTriggered: false,
            errors: [],
        };
        try {
            const lead = await Lead_1.Lead.findById(leadId);
            if (!lead) {
                result.errors?.push('Lead not found');
                return result;
            }
            if (!lead.hasWebsite || !lead.website) {
                result.errors?.push('Lead has no website');
                return result;
            }
            const analysis = website_analysis_service_1.websiteAnalysisService.resolveLead(lead);
            if (!analysis.analysisEligible) {
                result.errors?.push('Lead is not analysis-eligible — skipping audits');
                return result;
            }
            const needsResponsiveAudit = !lead.responsiveAuditCompleted;
            const needsBusinessIntelligence = !lead.intelligenceCompleted;
            const tasks = [];
            if (needsResponsiveAudit) {
                result.responsiveAuditTriggered = true;
                result.responsiveAuditStatus = 'queued';
                tasks.push({
                    name: `responsive:${leadId}`,
                    fn: async () => {
                        result.responsiveAuditStatus = 'running';
                        try {
                            await audit_concurrency_service_1.auditConcurrency.enqueue(leadId, 'responsive-audit', () => responsive_audit_service_1.responsiveAuditService.auditLead(leadId));
                            result.responsiveAuditStatus = 'completed';
                        }
                        catch (error) {
                            result.responsiveAuditStatus = 'failed';
                            const errorMsg = error instanceof Error ? error.message : String(error);
                            result.errors?.push(`Responsive audit failed: ${errorMsg}`);
                        }
                    },
                });
            }
            if (needsBusinessIntelligence) {
                result.businessIntelligenceTriggered = true;
                result.businessIntelligenceStatus = 'queued';
                tasks.push({
                    name: `business-intel:${leadId}`,
                    fn: async () => {
                        result.businessIntelligenceStatus = 'running';
                        try {
                            await audit_concurrency_service_1.auditConcurrency.enqueue(leadId, 'business-intelligence', () => business_intelligence_service_1.businessIntelligenceService.analyzeLead(leadId));
                            result.businessIntelligenceStatus = 'completed';
                        }
                        catch (error) {
                            result.businessIntelligenceStatus = 'failed';
                            const errorMsg = error instanceof Error ? error.message : String(error);
                            result.errors?.push(`Business intelligence failed: ${errorMsg}`);
                        }
                    },
                });
            }
            result.websiteIntelligenceTriggered = true;
            result.websiteIntelligenceStatus = 'queued';
            const executeSequentially = async () => {
                for (const task of tasks) {
                    await task.fn();
                }
                result.websiteIntelligenceStatus = 'running';
                try {
                    await audit_concurrency_service_1.auditConcurrency.enqueue(leadId, 'website-intelligence', () => website_intelligence_service_1.websiteIntelligenceService.analyzeLead(leadId));
                    result.websiteIntelligenceStatus = 'completed';
                }
                catch (error) {
                    result.websiteIntelligenceStatus = 'failed';
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    result.errors?.push(`Website intelligence failed: ${errorMsg}`);
                }
            };
            if (waitForCompletion) {
                await executeSequentially();
                logger_1.logger.info(`[LeadAuditTrigger] All audits completed for lead ${leadId}`);
            }
            else {
                executeSequentially().catch(err => {
                    logger_1.logger.error(err, `[LeadAuditTrigger] Background audit chain failed for lead ${leadId}`);
                });
            }
            return result;
        }
        catch (error) {
            result.errors?.push(error instanceof Error ? error.message : String(error));
            return result;
        }
    }
    async triggerMissingAuditsForMultipleLeads(leadIds) {
        const results = await Promise.all(leadIds.map(leadId => this.limit(async () => {
            try {
                return await this.triggerMissingAuditsForLead(leadId);
            }
            catch (error) {
                return {
                    leadId,
                    responsiveAuditTriggered: false,
                    businessIntelligenceTriggered: false,
                    websiteIntelligenceTriggered: false,
                    errors: [error instanceof Error ? error.message : String(error)],
                };
            }
        })));
        return results;
    }
    async triggerAllMissingAudits(options = {}) {
        const limit = options.limit || 20;
        const leads = await Lead_1.Lead.find({
            $and: [
                { website: { $exists: true, $nin: [null, ''] } },
                { $or: [
                        { hasRealWebsite: true },
                        { hasRealWebsite: { $exists: false } },
                    ] },
            ],
            $or: [
                { responsiveAuditCompleted: { $ne: true } },
                { intelligenceCompleted: { $ne: true } },
            ],
        })
            .limit(limit)
            .select('_id website');
        const leadIds = leads.map(lead => lead._id.toString());
        const results = await this.triggerMissingAuditsForMultipleLeads(leadIds);
        return {
            total: results.length,
            responsiveAuditTriggered: results.filter(r => r.responsiveAuditTriggered).length,
            businessIntelligenceTriggered: results.filter(r => r.businessIntelligenceTriggered).length,
            completed: results.filter(r => !r.errors || r.errors.length === 0).length,
            failed: results.filter(r => r.errors && r.errors.length > 0).length,
        };
    }
}
exports.LeadAuditTriggerService = LeadAuditTriggerService;
exports.leadAuditTriggerService = new LeadAuditTriggerService();
//# sourceMappingURL=lead-audit-trigger.service.js.map