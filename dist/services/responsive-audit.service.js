"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.responsiveAuditService = exports.ResponsiveAuditService = void 0;
const Lead_1 = require("../models/Lead");
const logger_1 = require("../utils/logger");
const uiux_intelligence_1 = require("../uiux-intelligence");
const website_analysis_service_1 = require("./website-analysis.service");
const audit_cache_service_1 = require("./audit-cache.service");
const audit_timeout_1 = require("../utils/audit-timeout");
const performance_profiler_service_1 = require("./performance-profiler.service");
const p_limit_1 = __importDefault(require("p-limit"));
class ResponsiveAuditService {
    constructor() {
        this.maxConcurrent = 3;
        this.limit = (0, p_limit_1.default)(this.maxConcurrent);
    }
    async auditLead(leadId, options = {}) {
        performance_profiler_service_1.profiler.start(`responsive-audit:${leadId}`, { leadId });
        const startTime = Date.now();
        try {
            logger_1.logger.info(`[ResponsiveAuditService] Starting audit for lead ${leadId}`);
            const lead = await Lead_1.Lead.findById(leadId);
            if (!lead) {
                logger_1.logger.warn(`[ResponsiveAuditService] Lead not found: ${leadId}`);
                return null;
            }
            if (!lead.hasWebsite || !lead.website) {
                logger_1.logger.warn(`[ResponsiveAuditService] Lead ${leadId} has no website`);
                return lead;
            }
            const analysis = website_analysis_service_1.websiteAnalysisService.resolveLead(lead);
            if (!analysis.analysisEligible) {
                logger_1.logger.warn(`[ResponsiveAuditService] Lead ${leadId} is not analysis-eligible (websiteType=${lead.websiteType}) — skipping audit`);
                logger_1.logger.info('[ResponsiveAudit] Responsive Audit Skipped — analysisEligible is false');
                return lead;
            }
            logger_1.logger.info('[ResponsiveAudit] Responsive Audit Started');
            logger_1.logger.info('[ResponsiveAudit] SEO Started');
            logger_1.logger.info('[ResponsiveAudit] UI/UX Audit Started');
            if (lead.responsiveAuditCompleted && !options.timeout) {
                const cacheKey = `responsive:${leadId}`;
                const cached = audit_cache_service_1.auditCache.getByWebsiteHash(cacheKey, lead.website);
                if (cached.isCached) {
                    logger_1.logger.info(`[ResponsiveAuditService] Returning cached audit for lead ${leadId}`);
                    return cached.data;
                }
            }
            logger_1.logger.info(`[ResponsiveAuditService] Website to audit: ${lead.website}`);
            logger_1.logger.info(`[ResponsiveAuditService] Starting responsive audit for lead ${leadId}`);
            let auditResult;
            try {
                const engineStartTime = Date.now();
                auditResult = await (0, audit_timeout_1.withTimeout)(uiux_intelligence_1.responsiveEngine.analyzeWebsite(lead.website, options), 90000, `ResponsiveEngine.analyzeWebsite(${leadId})`);
                const engineDuration = Date.now() - engineStartTime;
                logger_1.logger.info(`[ResponsiveAuditService] ✅ Engine returned results in ${engineDuration}ms: completed=${auditResult.responsiveAuditCompleted}, responsive=${auditResult.scores.responsiveScore}, uiux=${auditResult.scores.uiuxScore}, mobile=${auditResult.scores.mobileExperienceScore}`);
            }
            catch (engineError) {
                logger_1.logger.error(engineError instanceof Error ? engineError : new Error(String(engineError)), `[ResponsiveAuditService] ❌ Engine crashed for ${lead.website}`);
                throw engineError;
            }
            if (!auditResult.responsiveAuditCompleted) {
                logger_1.logger.warn(`[ResponsiveAuditService] ⚠️  Audit did not complete successfully for lead ${leadId}`);
                lead.responsiveAuditCompleted = false;
                lead.responsiveScore = auditResult.scores.responsiveScore || 0;
                lead.uiuxScore = auditResult.scores.uiuxScore || 0;
                lead.mobileExperienceScore = auditResult.scores.mobileExperienceScore || 0;
                lead.responsiveAudit = {
                    mobileFriendly: auditResult.responsiveAudit.mobileFriendly,
                    responsiveLayout: auditResult.responsiveAudit.responsiveLayout,
                    horizontalScroll: auditResult.responsiveAudit.horizontalScroll,
                    overflowIssues: auditResult.responsiveAudit.overflowIssues,
                    viewportMeta: auditResult.responsiveAudit.viewportMeta,
                    viewportContent: auditResult.responsiveAudit.viewportContent || undefined,
                    touchFriendly: auditResult.responsiveAudit.touchFriendly,
                    fontSizeIssues: auditResult.responsiveAudit.fontSizeIssues,
                };
                lead.uiuxAudit = {
                    alignmentIssues: auditResult.uiuxAudit.alignmentIssues,
                    brokenButtons: auditResult.uiuxAudit.brokenButtons,
                    croppedSections: auditResult.uiuxAudit.croppedSections,
                    mobileLayoutBroken: auditResult.uiuxAudit.mobileLayoutBroken,
                    overlappingContent: auditResult.uiuxAudit.overlappingContent,
                    hiddenContent: auditResult.uiuxAudit.hiddenContent,
                    navigationIssues: auditResult.uiuxAudit.navigationIssues,
                    spacingIssues: auditResult.uiuxAudit.spacingIssues,
                    issues: auditResult.uiuxAudit.issues,
                };
                lead.responsiveAuditedAt = auditResult.auditedAt;
                await lead.save();
                logger_1.logger.info(`[ResponsiveAuditService] ⚠️  Incomplete audit saved with default scores for lead ${leadId}`);
                return lead;
            }
            logger_1.logger.info(`[ResponsiveAuditService] 📊 Mapping audit results for lead ${leadId}`);
            lead.responsiveAudit = {
                mobileFriendly: auditResult.responsiveAudit.mobileFriendly,
                responsiveLayout: auditResult.responsiveAudit.responsiveLayout,
                horizontalScroll: auditResult.responsiveAudit.horizontalScroll,
                overflowIssues: auditResult.responsiveAudit.overflowIssues,
                viewportMeta: auditResult.responsiveAudit.viewportMeta,
                viewportContent: auditResult.responsiveAudit.viewportContent || undefined,
                touchFriendly: auditResult.responsiveAudit.touchFriendly,
                fontSizeIssues: auditResult.responsiveAudit.fontSizeIssues,
            };
            lead.uiuxAudit = {
                alignmentIssues: auditResult.uiuxAudit.alignmentIssues,
                brokenButtons: auditResult.uiuxAudit.brokenButtons,
                croppedSections: auditResult.uiuxAudit.croppedSections,
                mobileLayoutBroken: auditResult.uiuxAudit.mobileLayoutBroken,
                overlappingContent: auditResult.uiuxAudit.overlappingContent,
                hiddenContent: auditResult.uiuxAudit.hiddenContent,
                navigationIssues: auditResult.uiuxAudit.navigationIssues,
                spacingIssues: auditResult.uiuxAudit.spacingIssues,
                issues: auditResult.uiuxAudit.issues,
            };
            lead.responsiveScore = auditResult.scores.responsiveScore;
            lead.uiuxScore = auditResult.scores.uiuxScore;
            lead.mobileExperienceScore = auditResult.scores.mobileExperienceScore;
            lead.desktopScreenshot = auditResult.screenshots.desktopScreenshot || undefined;
            lead.mobileScreenshot = auditResult.screenshots.mobileScreenshot || undefined;
            lead.desktopMetrics = auditResult.desktopMetrics;
            lead.mobileMetrics = auditResult.mobileMetrics;
            lead.responsiveAuditCompleted = true;
            lead.responsiveAuditedAt = auditResult.auditedAt;
            logger_1.logger.info(`[ResponsiveAuditService] Saving audit results to MongoDB for lead ${leadId}`);
            await lead.save();
            if (lead.hasWebsite && lead.website) {
                audit_cache_service_1.auditCache.set(`responsive:${leadId}`, lead, lead.website);
            }
            performance_profiler_service_1.profiler.end();
            const totalDuration = Date.now() - startTime;
            logger_1.logger.info({ leadId, duration: totalDuration, responsiveScore: lead.responsiveScore, uiuxScore: lead.uiuxScore, mobileScore: lead.mobileExperienceScore }, `[ResponsiveAuditService] AUDIT COMPLETED for lead ${leadId} in ${totalDuration}ms`);
            return lead;
        }
        catch (error) {
            performance_profiler_service_1.profiler.end();
            const totalDuration = Date.now() - startTime;
            logger_1.logger.error({ err: error instanceof Error ? error.message : String(error), leadId, duration: totalDuration }, `[ResponsiveAuditService] AUDIT FAILED for lead ${leadId} after ${totalDuration}ms`);
            try {
                const lead = await Lead_1.Lead.findById(leadId);
                if (lead) {
                    lead.responsiveAuditCompleted = false;
                    lead.responsiveScore = 0;
                    lead.uiuxScore = 0;
                    lead.mobileExperienceScore = 0;
                    lead.responsiveAudit = {
                        mobileFriendly: false,
                        responsiveLayout: false,
                        horizontalScroll: false,
                        overflowIssues: false,
                        viewportMeta: false,
                        viewportContent: undefined,
                        touchFriendly: false,
                        fontSizeIssues: true,
                    };
                    lead.uiuxAudit = {
                        alignmentIssues: false,
                        brokenButtons: false,
                        croppedSections: false,
                        mobileLayoutBroken: false,
                        overlappingContent: false,
                        hiddenContent: false,
                        navigationIssues: false,
                        spacingIssues: false,
                        issues: [],
                    };
                    lead.responsiveAuditedAt = new Date();
                    await lead.save();
                    logger_1.logger.info(`[ResponsiveAuditService] Marked lead ${leadId} as audit failed with default scores in database`);
                }
            }
            catch (saveError) {
                logger_1.logger.error(saveError instanceof Error ? saveError : new Error(String(saveError)), `[ResponsiveAuditService] Failed to save failed audit state for lead ${leadId}`);
            }
            return null;
        }
    }
    async auditMultipleLeads(leadIds, options = {}) {
        logger_1.logger.info(`Starting bulk responsive audit for ${leadIds.length} leads`);
        const results = await Promise.all(leadIds.map(leadId => this.limit(async () => {
            try {
                const lead = await this.auditLead(leadId, options);
                return {
                    leadId,
                    success: !!lead,
                };
            }
            catch (error) {
                logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), `Bulk audit failed for lead ${leadId}:`);
                return {
                    leadId,
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                };
            }
        })));
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        logger_1.logger.info(`Bulk responsive audit completed: ${successful} successful, ${failed} failed`);
        return {
            success: true,
            message: `Audited ${leadIds.length} leads: ${successful} successful, ${failed} failed`,
            totalProcessed: leadIds.length,
            successful,
            failed,
            results,
        };
    }
    async auditLeadsWithoutAudit(options = {}) {
        try {
            const limit = options.limit || 50;
            const leads = await Lead_1.Lead.find({
                website: { $exists: true, $nin: [null, ''] },
                responsiveAuditCompleted: { $ne: true },
            })
                .limit(limit)
                .select('_id website');
            if (leads.length === 0) {
                logger_1.logger.info('No leads found without responsive audit');
                return {
                    success: true,
                    message: 'No leads found without responsive audit',
                    totalProcessed: 0,
                    successful: 0,
                    failed: 0,
                    results: [],
                };
            }
            logger_1.logger.info(`Found ${leads.length} leads without responsive audit`);
            const leadIds = leads.map(lead => lead._id.toString());
            return await this.auditMultipleLeads(leadIds, options);
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to audit leads without audit:');
            return {
                success: false,
                message: error instanceof Error ? error.message : String(error),
                totalProcessed: 0,
                successful: 0,
                failed: 0,
                results: [],
            };
        }
    }
    async getAuditStats() {
        try {
            const total = await Lead_1.Lead.countDocuments({ website: { $exists: true, $nin: [null, ''] } });
            const audited = await Lead_1.Lead.countDocuments({ responsiveAuditCompleted: true });
            const notAudited = total - audited;
            const scoreAggregation = await Lead_1.Lead.aggregate([
                { $match: { responsiveAuditCompleted: true } },
                {
                    $group: {
                        _id: null,
                        avgResponsive: { $avg: '$responsiveScore' },
                        avgUiux: { $avg: '$uiuxScore' },
                        avgMobile: { $avg: '$mobileExperienceScore' },
                    },
                },
            ]);
            const mobileUnfriendly = await Lead_1.Lead.countDocuments({
                'responsiveAudit.mobileFriendly': false,
            });
            const layoutIssues = await Lead_1.Lead.countDocuments({
                'responsiveAudit.responsiveLayout': false,
            });
            const alignmentIssues = await Lead_1.Lead.countDocuments({
                'uiuxAudit.alignmentIssues': true,
            });
            const horizontalScrollIssues = await Lead_1.Lead.countDocuments({
                'responsiveAudit.horizontalScroll': true,
            });
            const scores = scoreAggregation[0] || {
                avgResponsive: 0,
                avgUiux: 0,
                avgMobile: 0,
            };
            return {
                total,
                audited,
                notAudited,
                averageResponsiveScore: Math.round(scores.avgResponsive || 0),
                averageUiuxScore: Math.round(scores.avgUiux || 0),
                averageMobileScore: Math.round(scores.avgMobile || 0),
                mobileUnfriendly,
                layoutIssues,
                alignmentIssues,
                horizontalScrollIssues,
            };
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to get audit stats:');
            return {
                total: 0,
                audited: 0,
                notAudited: 0,
                averageResponsiveScore: 0,
                averageUiuxScore: 0,
                averageMobileScore: 0,
                mobileUnfriendly: 0,
                layoutIssues: 0,
                alignmentIssues: 0,
                horizontalScrollIssues: 0,
            };
        }
    }
    async reauditLead(leadId, options = {}) {
        logger_1.logger.info(`Re-auditing lead ${leadId}`);
        return await this.auditLead(leadId, options);
    }
}
exports.ResponsiveAuditService = ResponsiveAuditService;
exports.responsiveAuditService = new ResponsiveAuditService();
//# sourceMappingURL=responsive-audit.service.js.map