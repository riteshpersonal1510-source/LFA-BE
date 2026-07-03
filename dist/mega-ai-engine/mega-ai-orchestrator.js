"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.megaAIOrchestrator = exports.MegaAIOrchestrator = void 0;
const logger_1 = require("../utils/logger");
const responsive_audit_service_1 = require("../services/responsive-audit.service");
const business_intelligence_service_1 = require("../services/business-intelligence.service");
const sales_intelligence_service_1 = require("../services/sales-intelligence.service");
const outreach_service_1 = require("../services/outreach.service");
const Lead_1 = require("../models/Lead");
class MegaAIOrchestrator {
    async runFullPipeline(leadId) {
        const start = Date.now();
        const errors = [];
        const result = {
            leadId,
            companyName: '',
            responsiveAudit: false,
            businessIntelligence: false,
            salesIntelligence: false,
            outreach: false,
            crmUpdate: false,
            errors,
            duration: 0,
        };
        try {
            const lead = await Lead_1.Lead.findById(leadId).lean();
            if (!lead) {
                throw new Error('Lead not found');
            }
            result.companyName = lead.companyName || 'Unknown';
            if (!lead.website) {
                throw new Error('Lead has no website');
            }
            logger_1.logger.info(`MEGA AI: Starting full pipeline for lead ${leadId} (${result.companyName})`);
            try {
                logger_1.logger.info(`MEGA AI: Phase 13 - Responsive audit for ${leadId}`);
                await responsive_audit_service_1.responsiveAuditService.auditLead(leadId);
                result.responsiveAudit = true;
                logger_1.logger.info(`MEGA AI: Phase 13 completed for ${leadId}`);
            }
            catch (err) {
                errors.push(`Phase 13 (Responsive): ${err.message}`);
                logger_1.logger.error(err, `MEGA AI Phase 13 failed for ${leadId}:`);
            }
            try {
                logger_1.logger.info(`MEGA AI: Phase 14 - Business intelligence for ${leadId}`);
                await business_intelligence_service_1.businessIntelligenceService.analyzeLead(leadId);
                result.businessIntelligence = true;
                logger_1.logger.info(`MEGA AI: Phase 14 completed for ${leadId}`);
            }
            catch (err) {
                errors.push(`Phase 14 (Business Intel): ${err.message}`);
                logger_1.logger.error(err, `MEGA AI Phase 14 failed for ${leadId}:`);
            }
            try {
                logger_1.logger.info(`MEGA AI: Phase 15 - Sales intelligence for ${leadId}`);
                await sales_intelligence_service_1.salesIntelligenceService.analyzeLead(leadId);
                result.salesIntelligence = true;
                logger_1.logger.info(`MEGA AI: Phase 15 completed for ${leadId}`);
            }
            catch (err) {
                errors.push(`Phase 15 (Sales Intel): ${err.message}`);
                logger_1.logger.error(err, `MEGA AI Phase 15 failed for ${leadId}:`);
            }
            try {
                logger_1.logger.info(`MEGA AI: Phase 16 - Outreach generation for ${leadId}`);
                await outreach_service_1.outreachService.generateOutreachForLead(leadId);
                result.outreach = true;
                logger_1.logger.info(`MEGA AI: Phase 16 completed for ${leadId}`);
            }
            catch (err) {
                errors.push(`Phase 16 (Outreach): ${err.message}`);
                logger_1.logger.error(err, `MEGA AI Phase 16 failed for ${leadId}:`);
            }
            try {
                logger_1.logger.info(`MEGA AI: Updating CRM status for ${leadId}`);
                await Lead_1.Lead.findByIdAndUpdate(leadId, {
                    $set: {
                        crmOutreachStatus: 'outreach_pending',
                    },
                });
                result.crmUpdate = true;
            }
            catch (err) {
                errors.push(`CRM Update: ${err.message}`);
                logger_1.logger.error(err, `MEGA AI CRM update failed for ${leadId}:`);
            }
            result.duration = Date.now() - start;
            logger_1.logger.info(`MEGA AI: Full pipeline completed for ${leadId} in ${result.duration}ms. Errors: ${errors.length}`);
            return result;
        }
        catch (err) {
            errors.push(err.message);
            result.duration = Date.now() - start;
            logger_1.logger.error(err, `MEGA AI pipeline failed for ${leadId}:`);
            return result;
        }
    }
    async runFullPipelineForMultiple(leadIds) {
        const overallStart = Date.now();
        const results = [];
        for (const leadId of leadIds) {
            try {
                const r = await this.runFullPipeline(leadId);
                results.push(r);
            }
            catch (err) {
                results.push({
                    leadId,
                    companyName: '',
                    responsiveAudit: false,
                    businessIntelligence: false,
                    salesIntelligence: false,
                    outreach: false,
                    crmUpdate: false,
                    errors: [err.message],
                    duration: 0,
                });
            }
        }
        const successful = results.filter(r => r.errors.length === 0).length;
        const failed = results.filter(r => r.errors.length > 0).length;
        logger_1.logger.info(`MEGA AI: Batch complete - ${successful} successful, ${failed} failed out of ${leadIds.length} in ${Date.now() - overallStart}ms`);
        return {
            results,
            successful,
            failed,
            total: leadIds.length,
            totalDuration: Date.now() - overallStart,
        };
    }
    async runFullPipelineForPendingLeads(limit = 10) {
        const leads = await Lead_1.Lead.find({
            website: { $exists: true, $nin: [null, ''] },
            $or: [
                { responsiveAuditCompleted: { $ne: true } },
                { responsiveAuditCompleted: { $exists: false } },
            ],
        })
            .limit(limit)
            .lean();
        if (leads.length === 0) {
            return { results: [], successful: 0, failed: 0, total: 0 };
        }
        const leadIds = leads.map(l => l._id.toString());
        return this.runFullPipelineForMultiple(leadIds);
    }
    async getPipelineStats() {
        const [totalLeads, withWebsite, responsiveCompleted, intelligenceCompleted, salesCompleted, outreachCompleted,] = await Promise.all([
            Lead_1.Lead.countDocuments(),
            Lead_1.Lead.countDocuments({ website: { $exists: true, $nin: [null, ''] } }),
            Lead_1.Lead.countDocuments({ responsiveAuditCompleted: true }),
            Lead_1.Lead.countDocuments({ intelligenceCompleted: true }),
            Lead_1.Lead.countDocuments({ salesIntelligenceCompleted: true }),
            Lead_1.Lead.countDocuments({ outreachCompleted: true }),
        ]);
        const fullPipelineCompleted = await Lead_1.Lead.countDocuments({
            responsiveAuditCompleted: true,
            intelligenceCompleted: true,
            salesIntelligenceCompleted: true,
            outreachCompleted: true,
        });
        return {
            totalLeads,
            withWebsite,
            responsiveCompleted,
            intelligenceCompleted,
            salesCompleted,
            outreachCompleted,
            fullPipelineCompleted,
            pendingFullPipeline: totalLeads - fullPipelineCompleted,
        };
    }
}
exports.MegaAIOrchestrator = MegaAIOrchestrator;
exports.megaAIOrchestrator = new MegaAIOrchestrator();
//# sourceMappingURL=mega-ai-orchestrator.js.map