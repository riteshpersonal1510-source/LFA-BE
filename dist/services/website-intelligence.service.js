"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.websiteIntelligenceService = exports.WebsiteIntelligenceService = void 0;
const Lead_1 = require("../models/Lead");
const logger_1 = require("../utils/logger");
const website_intelligence_1 = require("../website-intelligence");
const website_analysis_service_1 = require("./website-analysis.service");
const audit_cache_service_1 = require("./audit-cache.service");
const audit_timeout_1 = require("../utils/audit-timeout");
const p_limit_1 = __importDefault(require("p-limit"));
class WebsiteIntelligenceService {
    constructor() {
        this.maxConcurrent = 3;
        this.limit = (0, p_limit_1.default)(this.maxConcurrent);
    }
    async analyzeLead(leadId, options = {}) {
        try {
            const lead = await Lead_1.Lead.findById(leadId);
            if (!lead) {
                logger_1.logger.warn(`Lead not found: ${leadId}`);
                return null;
            }
            if (!lead.hasWebsite || !lead.website) {
                logger_1.logger.warn(`Lead ${leadId} has no website`);
                return lead;
            }
            const analysis = website_analysis_service_1.websiteAnalysisService.resolveLead(lead);
            if (!analysis.analysisEligible) {
                logger_1.logger.warn(`[WebsiteIntelligenceService] Lead ${leadId} is not analysis-eligible (websiteType=${lead.websiteType}) — skipping intelligence`);
                logger_1.logger.info('[WebsiteIntelligence] AI Started — Skipped (analysisEligible is false)');
                return lead;
            }
            logger_1.logger.info('[WebsiteIntelligence] AI Started');
            if (lead.intelligenceCompleted && !options.forceRefresh && lead.hasWebsite && lead.website) {
                const cacheKey = `website-intel:${leadId}`;
                const cached = audit_cache_service_1.auditCache.getByWebsiteHash(cacheKey, lead.website);
                if (cached.isCached) {
                    logger_1.logger.info(`Returning cached website intelligence for lead ${leadId}`);
                    return cached.data;
                }
            }
            logger_1.logger.info(`Starting website intelligence analysis for lead ${leadId}: ${lead.website}`);
            const report = await (0, audit_timeout_1.withTimeout)(website_intelligence_1.websiteIntelligenceEngine.analyzeWebsite(lead.website, {
                timeout: options.timeout,
                category: lead.category,
            }), 90000, `WebsiteIntelligence.analyzeWebsite(${leadId})`);
            lead.intelligenceCompleted = report.intelligenceCompleted;
            lead.intelligenceAnalyzedAt = report.analyzedAt;
            lead.intelligenceAnalysisDuration = report.analysisDuration;
            lead.intelligenceWebsiteHash = report.websiteHash;
            lead.websiteIntelligence = {
                trustScore: report.trustScore,
                trustScoreLevel: report.trustScoreLevel,
                qualityScore: report.qualityScore,
                seoScore: report.seoScore,
                uiScore: report.uiScore,
                uxScore: report.uxScore,
                performanceScore: report.performanceScore,
                accessibilityScore: report.accessibilityScore,
                securityScore: report.securityScore,
                mobileScore: report.mobileScore,
                businessOpportunityScore: report.businessOpportunityScore,
                leadPriorityScore: report.leadPriorityScore,
                issues: report.issues,
                recommendations: report.recommendations,
                metaAnalysis: report.metaAnalysis,
                performanceMetrics: report.performanceMetrics,
                securityDetails: report.securityDetails,
                seoDetails: report.seoDetails,
                uiDetails: report.uiDetails,
                contentAnalysis: report.contentAnalysis,
                categorySpecific: report.categorySpecific,
                analysisDuration: report.analysisDuration,
                analyzedAt: report.analyzedAt,
            };
            await lead.save();
            if (lead.hasWebsite && lead.website) {
                audit_cache_service_1.auditCache.set(`website-intel:${leadId}`, lead, lead.website);
            }
            logger_1.logger.info(`Website intelligence completed for lead ${leadId}: trust=${report.trustScore}, seo=${report.seoScore}, issues=${report.issues.length}`);
            return lead;
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), `Failed website intelligence for lead ${leadId}:`);
            try {
                const lead = await Lead_1.Lead.findById(leadId);
                if (lead)
                    lead.intelligenceCompleted = false;
                await lead?.save();
            }
            catch { }
            return null;
        }
    }
    async analyzeMultipleLeads(leadIds, options = {}) {
        logger_1.logger.info(`Starting bulk website intelligence for ${leadIds.length} leads`);
        const results = await Promise.all(leadIds.map(leadId => this.limit(async () => {
            try {
                const lead = await this.analyzeLead(leadId, options);
                return { leadId, success: !!lead };
            }
            catch (error) {
                logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), `Bulk intelligence failed for ${leadId}:`);
                return { leadId, success: false, error: error instanceof Error ? error.message : String(error) };
            }
        })));
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        return {
            success: true,
            message: `Analyzed ${leadIds.length} leads: ${successful} successful, ${failed} failed`,
            totalProcessed: leadIds.length,
            successful,
            failed,
            results,
        };
    }
    async reanalyzeLead(leadId, options = {}) {
        logger_1.logger.info(`Re-analyzing website intelligence for lead ${leadId}`);
        return this.analyzeLead(leadId, { ...options, forceRefresh: true });
    }
    async getIntelligenceStats() {
        try {
            const total = await Lead_1.Lead.countDocuments({ website: { $exists: true, $nin: [null, ''] } });
            const analyzed = await Lead_1.Lead.countDocuments({ intelligenceCompleted: true });
            const notAnalyzed = total - analyzed;
            const agg = await Lead_1.Lead.aggregate([
                { $match: { intelligenceCompleted: true } },
                { $group: { _id: null, avgTrust: { $avg: '$websiteIntelligence.trustScore' }, avgQuality: { $avg: '$websiteIntelligence.qualityScore' } } },
            ]);
            const highOpportunity = await Lead_1.Lead.countDocuments({ 'websiteIntelligence.businessOpportunityScore': { $gte: 70 } });
            return {
                total,
                analyzed,
                notAnalyzed,
                averageTrustScore: Math.round(agg[0]?.avgTrust || 0),
                averageQualityScore: Math.round(agg[0]?.avgQuality || 0),
                highOpportunity,
            };
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to get intelligence stats:');
            return { total: 0, analyzed: 0, notAnalyzed: 0, averageTrustScore: 0, averageQualityScore: 0, highOpportunity: 0 };
        }
    }
}
exports.WebsiteIntelligenceService = WebsiteIntelligenceService;
exports.websiteIntelligenceService = new WebsiteIntelligenceService();
//# sourceMappingURL=website-intelligence.service.js.map