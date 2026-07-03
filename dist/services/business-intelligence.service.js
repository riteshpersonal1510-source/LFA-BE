"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.businessIntelligenceService = exports.BusinessIntelligenceService = void 0;
const Lead_1 = require("../models/Lead");
const logger_1 = require("../utils/logger");
const business_intelligence_1 = require("../business-intelligence");
const website_analysis_service_1 = require("./website-analysis.service");
const audit_cache_service_1 = require("./audit-cache.service");
const audit_timeout_1 = require("../utils/audit-timeout");
const performance_profiler_service_1 = require("./performance-profiler.service");
const p_limit_1 = __importDefault(require("p-limit"));
class BusinessIntelligenceService {
    constructor() {
        this.maxConcurrent = 3;
        this.limit = (0, p_limit_1.default)(this.maxConcurrent);
    }
    async analyzeLead(leadId, options = {}) {
        performance_profiler_service_1.profiler.start(`business-intel:${leadId}`, { leadId });
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
                logger_1.logger.warn(`[BusinessIntelligenceService] Lead ${leadId} is not analysis-eligible (websiteType=${lead.websiteType}) — skipping intelligence`);
                return lead;
            }
            logger_1.logger.info('[BusinessIntelligence] AI Started');
            if (lead.intelligenceCompleted && !options.includeDeepAnalysis) {
                const cacheKey = `intelligence:${leadId}`;
                const cached = audit_cache_service_1.auditCache.getByWebsiteHash(cacheKey, lead.website);
                if (cached.isCached) {
                    logger_1.logger.info(`Returning cached intelligence for lead ${leadId}`);
                    return cached.data;
                }
            }
            logger_1.logger.info(`Starting business intelligence analysis for lead ${leadId}: ${lead.website}`);
            const existingData = {
                sslEnabled: lead.sslEnabled || false,
                seoScore: lead.seoScore || 0,
                responsiveScore: lead.responsiveScore || 0,
                uiuxScore: lead.uiuxScore || 0,
                responseTime: lead.responseTime || 0,
            };
            const report = await (0, audit_timeout_1.withTimeout)(business_intelligence_1.businessIntelligenceEngine.analyzeWebsite(lead.website, existingData, options), 90000, `BusinessIntelligence.analyzeWebsite(${leadId})`);
            if (!report.intelligenceCompleted) {
                logger_1.logger.warn(`Business intelligence did not complete for lead ${leadId}: ${lead.website}`);
                lead.intelligenceCompleted = false;
                await lead.save();
                return lead;
            }
            lead.footerAudit = {
                copyrightDetected: report.footerAnalysis.copyrightDetected,
                copyrightYear: report.footerAnalysis.copyrightYear,
                privacyPolicy: report.footerAnalysis.privacyPolicy,
                termsPage: report.footerAnalysis.termsPage,
                footerComplete: report.footerAnalysis.footerComplete,
                footerLinks: report.footerAnalysis.footerLinks,
                hasContactInfo: report.footerAnalysis.hasContactInfo,
            };
            lead.socialAudit = {
                instagram: report.socialAudit.instagram,
                facebook: report.socialAudit.facebook,
                linkedin: report.socialAudit.linkedin,
                twitter: report.socialAudit.twitter,
                youtube: report.socialAudit.youtube,
                whatsapp: report.socialAudit.whatsapp,
                socialPresenceScore: report.socialAudit.socialPresenceScore,
                detectedLinks: report.socialAudit.detectedLinks,
            };
            lead.contactAudit = {
                phoneDetected: report.contactAudit.phoneDetected,
                emailDetected: report.contactAudit.emailDetected,
                contactForm: report.contactAudit.contactForm,
                googleMapsEmbed: report.contactAudit.googleMapsEmbed,
                officeAddress: report.contactAudit.officeAddress,
                whatsappButton: report.contactAudit.whatsappButton,
                contactMethods: report.contactAudit.contactMethods,
            };
            lead.trustScore = report.trustScore.score;
            lead.trustScoreLevel = report.trustScore.level;
            lead.websiteFreshness = {
                status: report.websiteFreshness.status,
                copyrightYear: report.websiteFreshness.copyrightYear,
                yearsBehind: report.websiteFreshness.yearsBehind,
                staleCopyright: report.websiteFreshness.staleCopyright,
                designGeneration: report.websiteFreshness.designGeneration,
                modernStandards: report.websiteFreshness.modernStandards,
            };
            lead.businessOpportunity = {
                level: report.businessOpportunity.level,
                score: report.businessOpportunity.score,
                reasons: report.businessOpportunity.reasons,
                recommendation: report.businessOpportunity.recommendation,
                estimatedValue: report.businessOpportunity.estimatedValue,
            };
            lead.seoScore = report.websiteQualityScore.breakdown.seo;
            lead.websiteQualityScore = report.websiteQualityScore.overall;
            lead.socialPresenceScore = report.socialAudit.socialPresenceScore;
            lead.copyrightYear = report.footerAnalysis.copyrightYear ?? undefined;
            lead.aiRecommendation = {
                summary: report.aiRecommendation.summary,
                services: report.aiRecommendation.services,
                priority: report.aiRecommendation.priority,
                estimatedImpact: report.aiRecommendation.estimatedImpact,
                keyIssues: report.aiRecommendation.keyIssues,
            };
            lead.intelligenceCompleted = report.intelligenceCompleted;
            lead.intelligenceAnalyzedAt = report.analyzedAt;
            await lead.save();
            if (lead.hasWebsite && lead.website) {
                audit_cache_service_1.auditCache.set(`intelligence:${leadId}`, lead, lead.website);
            }
            performance_profiler_service_1.profiler.end();
            logger_1.logger.info({ leadId, trustScore: lead.trustScore, opportunity: lead.businessOpportunity?.level }, `Business intelligence completed for lead ${leadId}`);
            return lead;
        }
        catch (error) {
            performance_profiler_service_1.profiler.end();
            logger_1.logger.error({ err: error instanceof Error ? error.message : String(error), leadId }, `Failed to analyze business intelligence for lead ${leadId}:`);
            try {
                const lead = await Lead_1.Lead.findById(leadId);
                if (lead) {
                    lead.intelligenceCompleted = false;
                    await lead.save();
                }
            }
            catch { }
            return null;
        }
    }
    async analyzeMultipleLeads(leadIds, options = {}) {
        logger_1.logger.info(`Starting bulk business intelligence analysis for ${leadIds.length} leads`);
        const results = await Promise.all(leadIds.map(leadId => this.limit(async () => {
            try {
                const lead = await this.analyzeLead(leadId, options);
                return {
                    leadId,
                    success: !!lead,
                };
            }
            catch (error) {
                logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), `Bulk intelligence failed for lead ${leadId}:`);
                return {
                    leadId,
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                };
            }
        })));
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        logger_1.logger.info(`Bulk business intelligence completed: ${successful} successful, ${failed} failed`);
        return {
            success: true,
            message: `Analyzed ${leadIds.length} leads: ${successful} successful, ${failed} failed`,
            totalProcessed: leadIds.length,
            successful,
            failed,
            results,
        };
    }
    async analyzeLeadsWithoutIntelligence(options = {}) {
        try {
            const limit = options.limit || 50;
            const leads = await Lead_1.Lead.find({
                website: { $exists: true, $nin: [null, ''] },
                intelligenceCompleted: { $ne: true },
            })
                .limit(limit)
                .select('_id website');
            if (leads.length === 0) {
                logger_1.logger.info('No leads found without business intelligence');
                return {
                    success: true,
                    message: 'No leads found without business intelligence',
                    totalProcessed: 0,
                    successful: 0,
                    failed: 0,
                    results: [],
                };
            }
            logger_1.logger.info(`Found ${leads.length} leads without business intelligence`);
            const leadIds = leads.map(lead => lead._id.toString());
            return await this.analyzeMultipleLeads(leadIds, options);
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to analyze leads without intelligence:');
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
    async getIntelligenceStats() {
        try {
            const total = await Lead_1.Lead.countDocuments({ website: { $exists: true, $nin: [null, ''] } });
            const analyzed = await Lead_1.Lead.countDocuments({ intelligenceCompleted: true });
            const notAnalyzed = total - analyzed;
            const scoreAggregation = await Lead_1.Lead.aggregate([
                { $match: { intelligenceCompleted: true } },
                {
                    $group: {
                        _id: null,
                        avgTrustScore: { $avg: '$trustScore' },
                        avgQualityScore: { $avg: '$websiteQualityScore' },
                    },
                },
            ]);
            const highOpportunity = await Lead_1.Lead.countDocuments({
                'businessOpportunity.level': 'high',
            });
            const mediumOpportunity = await Lead_1.Lead.countDocuments({
                'businessOpportunity.level': 'medium',
            });
            const lowOpportunity = await Lead_1.Lead.countDocuments({
                'businessOpportunity.level': 'low',
            });
            const websitesWithOutdatedDesign = await Lead_1.Lead.countDocuments({
                'websiteFreshness.status': { $in: ['outdated', 'very-outdated'] },
            });
            const businessesWithoutSocial = await Lead_1.Lead.countDocuments({
                intelligenceCompleted: true,
                'socialAudit.socialPresenceScore': { $lt: 40 },
            });
            const businessesWithoutContactForm = await Lead_1.Lead.countDocuments({
                'contactAudit.contactForm': false,
            });
            const weakTrustScore = await Lead_1.Lead.countDocuments({
                trustScore: { $lt: 50 },
            });
            const outdatedCopyright = await Lead_1.Lead.countDocuments({
                copyrightYear: { $lt: new Date().getFullYear() - 2 },
            });
            const scores = scoreAggregation[0] || {
                avgTrustScore: 0,
                avgQualityScore: 0,
            };
            return {
                total,
                analyzed,
                notAnalyzed,
                averageTrustScore: Math.round(scores.avgTrustScore || 0),
                averageQualityScore: Math.round(scores.avgQualityScore || 0),
                highOpportunity,
                mediumOpportunity,
                lowOpportunity,
                websitesWithOutdatedDesign,
                businessesWithoutSocial,
                businessesWithoutContactForm,
                weakTrustScore,
                outdatedCopyright,
            };
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to get intelligence stats:');
            return {
                total: 0,
                analyzed: 0,
                notAnalyzed: 0,
                averageTrustScore: 0,
                averageQualityScore: 0,
                highOpportunity: 0,
                mediumOpportunity: 0,
                lowOpportunity: 0,
                websitesWithOutdatedDesign: 0,
                businessesWithoutSocial: 0,
                businessesWithoutContactForm: 0,
                weakTrustScore: 0,
                outdatedCopyright: 0,
            };
        }
    }
    async reanalyzeLead(leadId, options = {}) {
        logger_1.logger.info(`Re-analyzing business intelligence for lead ${leadId}`);
        return await this.analyzeLead(leadId, options);
    }
}
exports.BusinessIntelligenceService = BusinessIntelligenceService;
exports.businessIntelligenceService = new BusinessIntelligenceService();
//# sourceMappingURL=business-intelligence.service.js.map