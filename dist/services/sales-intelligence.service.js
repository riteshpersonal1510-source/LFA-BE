"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.salesIntelligenceService = exports.SalesIntelligenceService = void 0;
const Lead_1 = require("../models/Lead");
const logger_1 = require("../utils/logger");
const ai_sales_intelligence_1 = require("../ai-sales-intelligence");
const p_limit_1 = __importDefault(require("p-limit"));
class SalesIntelligenceService {
    constructor() {
        this.maxConcurrent = 5;
        this.limit = (0, p_limit_1.default)(this.maxConcurrent);
    }
    async analyzeLead(leadId, _options = {}) {
        try {
            const lead = await Lead_1.Lead.findById(leadId);
            if (!lead) {
                logger_1.logger.warn(`Lead not found: ${leadId}`);
                return null;
            }
            logger_1.logger.info(`Starting AI sales intelligence for lead ${leadId}: ${lead.companyName}`);
            const competitorContext = await this.getCompetitorContext(lead);
            const report = await ai_sales_intelligence_1.salesIntelligenceEngine.analyze(lead, competitorContext);
            lead.aiLeadScore = report.aiLeadScore;
            lead.conversionProbability = report.conversionProbability;
            lead.websiteRedesignPotential = report.websiteRedesignPotential;
            lead.seoOpportunity = report.seoOpportunity;
            lead.digitalMarketingOpportunity = report.digitalMarketingOpportunity;
            lead.revenuePotential = report.revenuePotential;
            lead.salesPriority = report.salesPriority;
            lead.aiInsight = report.aiInsight;
            lead.competitionLevel = report.competitionLevel;
            lead.marketOpportunity = report.marketOpportunity;
            lead.salesIntelligenceCompleted = report.salesIntelligenceCompleted;
            lead.salesIntelligenceAnalyzedAt = report.analyzedAt;
            await lead.save();
            logger_1.logger.info(`Sales intelligence completed for lead ${leadId}: score=${report.aiLeadScore}, priority=${report.salesPriority}`);
            return lead;
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), `Failed sales intelligence for lead ${leadId}:`);
            try {
                const lead = await Lead_1.Lead.findById(leadId);
                if (lead) {
                    lead.salesIntelligenceCompleted = false;
                    await lead.save();
                }
            }
            catch { }
            return null;
        }
    }
    async analyzeMultipleLeads(leadIds, options = {}) {
        logger_1.logger.info(`Starting bulk sales intelligence for ${leadIds.length} leads`);
        const results = await Promise.all(leadIds.map(leadId => this.limit(async () => {
            try {
                const lead = await this.analyzeLead(leadId, options);
                return { leadId, success: !!lead };
            }
            catch (error) {
                logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), `Bulk sales intelligence failed for lead ${leadId}:`);
                return {
                    leadId,
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                };
            }
        })));
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        logger_1.logger.info(`Bulk sales intelligence completed: ${successful} successful, ${failed} failed`);
        return {
            success: true,
            message: `Analyzed ${leadIds.length} leads: ${successful} successful, ${failed} failed`,
            totalProcessed: leadIds.length,
            successful,
            failed,
            results,
        };
    }
    async analyzeLeadsWithoutAnalysis(options = {}) {
        try {
            const limit = options.limit || 50;
            const leads = await Lead_1.Lead.find({
                salesIntelligenceCompleted: { $ne: true },
            })
                .limit(limit)
                .select('_id companyName');
            if (leads.length === 0) {
                logger_1.logger.info('No leads found without sales intelligence');
                return {
                    success: true,
                    message: 'No leads found without sales intelligence',
                    totalProcessed: 0,
                    successful: 0,
                    failed: 0,
                    results: [],
                };
            }
            logger_1.logger.info(`Found ${leads.length} leads without sales intelligence`);
            const leadIds = leads.map(lead => lead._id.toString());
            return await this.analyzeMultipleLeads(leadIds, options);
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to analyze leads without sales intelligence:');
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
    async getSalesStats() {
        try {
            const total = await Lead_1.Lead.countDocuments();
            const analyzed = await Lead_1.Lead.countDocuments({ salesIntelligenceCompleted: true });
            const notAnalyzed = total - analyzed;
            const scoreAgg = await Lead_1.Lead.aggregate([
                { $match: { salesIntelligenceCompleted: true } },
                { $group: { _id: null, avgScore: { $avg: '$aiLeadScore' } } },
            ]);
            const [urgentLeads, highPriorityLeads, highConversionLeads, highRedesignPotential, highSeoOpportunity, enterpriseRevenue, highRevenue,] = await Promise.all([
                Lead_1.Lead.countDocuments({ salesPriority: 'urgent' }),
                Lead_1.Lead.countDocuments({ salesPriority: 'high' }),
                Lead_1.Lead.countDocuments({ conversionProbability: 'high' }),
                Lead_1.Lead.countDocuments({ websiteRedesignPotential: 'high' }),
                Lead_1.Lead.countDocuments({ seoOpportunity: 'high' }),
                Lead_1.Lead.countDocuments({ revenuePotential: 'enterprise' }),
                Lead_1.Lead.countDocuments({ revenuePotential: 'high' }),
            ]);
            return {
                total,
                analyzed,
                notAnalyzed,
                averageAiScore: Math.round(scoreAgg[0]?.avgScore || 0),
                urgentLeads,
                highPriorityLeads,
                highConversionLeads,
                highRedesignPotential,
                highSeoOpportunity,
                enterpriseRevenue,
                highRevenue,
            };
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to get sales stats:');
            return {
                total: 0, analyzed: 0, notAnalyzed: 0, averageAiScore: 0,
                urgentLeads: 0, highPriorityLeads: 0, highConversionLeads: 0,
                highRedesignPotential: 0, highSeoOpportunity: 0,
                enterpriseRevenue: 0, highRevenue: 0,
            };
        }
    }
    async getCompetitorContext(lead) {
        try {
            const area = lead.searchedArea;
            const category = lead.category;
            const [areaCount, categoryCount, categoryScoreAgg, categoryTrustAgg] = await Promise.all([
                area ? Lead_1.Lead.countDocuments({ searchedArea: area }) : Promise.resolve(0),
                category ? Lead_1.Lead.countDocuments({ category }) : Promise.resolve(0),
                category
                    ? Lead_1.Lead.aggregate([
                        { $match: { category, aiLeadScore: { $exists: true } } },
                        { $group: { _id: null, avgScore: { $avg: '$aiLeadScore' } } },
                    ])
                    : Promise.resolve([]),
                category
                    ? Lead_1.Lead.aggregate([
                        { $match: { category, trustScore: { $exists: true } } },
                        { $group: { _id: null, avgScore: { $avg: '$trustScore' } } },
                    ])
                    : Promise.resolve([]),
            ]);
            return {
                totalLeadsInSameArea: areaCount,
                totalLeadsInSameCategory: categoryCount,
                averageScoreInCategory: Math.round(categoryScoreAgg[0]?.avgScore || 0),
                averageTrustScoreInCategory: Math.round(categoryTrustAgg[0]?.avgScore || 0),
            };
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to get competitor context:');
            return { totalLeadsInSameArea: 0, totalLeadsInSameCategory: 0, averageScoreInCategory: 0, averageTrustScoreInCategory: 0 };
        }
    }
}
exports.SalesIntelligenceService = SalesIntelligenceService;
exports.salesIntelligenceService = new SalesIntelligenceService();
//# sourceMappingURL=sales-intelligence.service.js.map