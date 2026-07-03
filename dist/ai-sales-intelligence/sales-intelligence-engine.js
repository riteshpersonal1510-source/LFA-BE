"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.salesIntelligenceEngine = exports.SalesIntelligenceEngine = void 0;
const logger_1 = require("../utils/logger");
const lead_score_engine_1 = require("./lead-score-engine");
const conversion_predictor_1 = require("./conversion-predictor");
const redesign_potential_engine_1 = require("./redesign-potential-engine");
const seo_opportunity_engine_1 = require("./seo-opportunity-engine");
const revenue_predictor_1 = require("./revenue-predictor");
const sales_priority_engine_1 = require("./sales-priority-engine");
const opportunity_classifier_1 = require("./opportunity-classifier");
const ai_insight_generator_1 = require("./ai-insight-generator");
const competitor_analysis_engine_1 = require("./competitor-analysis-engine");
const digital_marketing_opportunity_engine_1 = require("./digital-marketing-opportunity-engine");
class SalesIntelligenceEngine {
    async analyze(lead, competitorContext, _options = {}) {
        try {
            logger_1.logger.info(`Starting AI sales intelligence analysis for lead ${lead._id}`);
            const scoreInput = {
                seoScore: lead.responsiveScore || 0,
                uiuxScore: lead.uiuxScore || 0,
                responsiveScore: lead.responsiveScore || 0,
                trustScore: lead.trustScore || 0,
                socialPresenceScore: lead.socialPresenceScore || 0,
                websiteQualityScore: lead.websiteQualityScore || 0,
                websiteFreshnessStatus: lead.websiteFreshness?.status || 'unknown',
                hasContactForm: lead.contactAudit?.contactForm || false,
                hasPhone: lead.contactAudit?.phoneDetected || !!lead.phone,
                hasEmail: lead.contactAudit?.emailDetected || !!lead.email,
                rating: lead.rating || 0,
                reviewsCount: lead.reviewsCount || 0,
            };
            const aiLeadScore = lead_score_engine_1.leadScoreEngine.calculateScore(scoreInput);
            const redesignPotential = redesign_potential_engine_1.redesignPotentialEngine.assess({
                responsiveScore: lead.responsiveScore || 0,
                uiuxScore: lead.uiuxScore || 0,
                viewportMeta: lead.responsiveAudit?.viewportMeta || false,
                mobileFriendly: lead.responsiveAudit?.mobileFriendly || false,
                horizontalScroll: lead.responsiveAudit?.horizontalScroll || false,
                copyrightYear: lead.copyrightYear || null,
                websiteFreshnessStatus: lead.websiteFreshness?.status || 'unknown',
                designGeneration: lead.websiteFreshness?.designGeneration || 'unknown',
                hasBrokenButtons: lead.uiuxAudit?.brokenButtons || false,
                hasCroppedSections: lead.uiuxAudit?.croppedSections || false,
                hasNavigationIssues: lead.uiuxAudit?.navigationIssues || false,
            });
            const seoOpportunity = seo_opportunity_engine_1.seoOpportunityEngine.assess({
                seoScore: lead.responsiveScore || 0,
                metaTitle: lead.metaTitle || null,
                metaDescription: lead.metaDescription || null,
                hasContactPage: lead.hasContactPage || false,
                sslEnabled: lead.sslEnabled || false,
                responseTime: lead.responseTime || 0,
            });
            const digitalMarketingOpportunity = digital_marketing_opportunity_engine_1.digitalMarketingOpportunityEngine.assess({
                socialPresenceScore: lead.socialPresenceScore || 0,
                hasFacebook: lead.socialAudit?.facebook || false,
                hasInstagram: lead.socialAudit?.instagram || false,
                hasLinkedin: lead.socialAudit?.linkedin || false,
                hasTwitter: lead.socialAudit?.twitter || false,
                hasYoutube: lead.socialAudit?.youtube || false,
                hasContactForm: lead.contactAudit?.contactForm || false,
                websiteFreshnessStatus: lead.websiteFreshness?.status || 'unknown',
                rating: lead.rating || 0,
            });
            const conversionProbability = conversion_predictor_1.conversionPredictor.predict({
                responsiveScore: lead.responsiveScore || 0,
                uiuxScore: lead.uiuxScore || 0,
                trustScore: lead.trustScore || 0,
                seoOpportunity: seoOpportunity,
                redesignPotential: redesignPotential,
                websiteFreshnessStatus: lead.websiteFreshness?.status || 'unknown',
                socialPresenceScore: lead.socialPresenceScore || 0,
            });
            const revenuePotential = revenue_predictor_1.revenuePredictor.predict({
                rating: lead.rating || 0,
                reviewsCount: lead.reviewsCount || 0,
                websiteQualityScore: lead.websiteQualityScore || 0,
                socialPresenceScore: lead.socialPresenceScore || 0,
                category: lead.category || null,
                area: lead.searchedArea || null,
                leadScore: aiLeadScore,
            });
            const salesPriority = sales_priority_engine_1.salesPriorityEngine.assess({
                aiLeadScore,
                conversionProbability,
                websiteRedesignPotential: redesignPotential,
                seoOpportunity: seoOpportunity,
                revenuePotential: revenuePotential,
                trustScore: lead.trustScore || 0,
                rating: lead.rating || 0,
                reviewsCount: lead.reviewsCount || 0,
            });
            opportunity_classifier_1.opportunityClassifier.classify({
                redesignPotential,
                seoOpportunity,
                digitalMarketingOpportunity,
                conversionProbability,
                revenuePotential,
            });
            const aiInsight = ai_insight_generator_1.aiInsightGenerator.generate({
                aiLeadScore,
                conversionProbability,
                websiteRedesignPotential: redesignPotential,
                seoOpportunity: seoOpportunity,
                digitalMarketingOpportunity,
                revenuePotential,
                salesPriority,
                trustScore: lead.trustScore || 0,
                aiLeadScoreOld: lead.aiLeadScore || null,
            });
            let competitionLevel = 'medium';
            let marketOpportunity = 'medium';
            if (competitorContext) {
                const competitorResult = competitor_analysis_engine_1.competitorAnalysisEngine.analyze({
                    ...competitorContext,
                    leadScore: aiLeadScore,
                    trustScore: lead.trustScore || 0,
                });
                competitionLevel = competitorResult.competitionLevel;
                marketOpportunity = competitorResult.marketOpportunity;
            }
            const report = {
                aiLeadScore,
                conversionProbability,
                websiteRedesignPotential: redesignPotential,
                seoOpportunity: seoOpportunity,
                digitalMarketingOpportunity,
                revenuePotential,
                salesPriority,
                aiInsight,
                competitionLevel,
                marketOpportunity,
                analyzedAt: new Date(),
                salesIntelligenceCompleted: true,
            };
            logger_1.logger.info(`Sales intelligence completed: score=${aiLeadScore}, priority=${salesPriority}, conversion=${conversionProbability}`);
            return report;
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), `Sales intelligence analysis failed for lead ${lead._id}:`);
            return this.getDefaultReport();
        }
    }
    getDefaultReport() {
        return {
            aiLeadScore: 0,
            conversionProbability: 'low',
            websiteRedesignPotential: 'low',
            seoOpportunity: 'low',
            digitalMarketingOpportunity: 'low',
            revenuePotential: 'low',
            salesPriority: 'low',
            aiInsight: 'Analysis incomplete',
            competitionLevel: 'medium',
            marketOpportunity: 'medium',
            analyzedAt: new Date(),
            salesIntelligenceCompleted: false,
        };
    }
}
exports.SalesIntelligenceEngine = SalesIntelligenceEngine;
exports.salesIntelligenceEngine = new SalesIntelligenceEngine();
//# sourceMappingURL=sales-intelligence-engine.js.map