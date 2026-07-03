"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsService = exports.AnalyticsService = void 0;
const Lead_1 = require("../models/Lead");
const Automation_1 = require("../models/Automation");
const logger_1 = require("../utils/logger");
class AnalyticsService {
    async getOverview(filter = {}) {
        try {
            const dateQuery = this.getDateRangeQuery(filter);
            const [totalLeads, highPotentialLeads, websitesWithoutSsl, noWebsiteBusinesses, emailsAgg, phonesAgg, websitesAgg, totalAutomations, totalExports,] = await Promise.all([
                Lead_1.Lead.countDocuments(dateQuery),
                Lead_1.Lead.countDocuments({
                    ...dateQuery,
                    qualificationLevel: 'high-potential',
                }),
                Lead_1.Lead.countDocuments({
                    ...dateQuery,
                    website: { $exists: true, $nin: [null, ''] },
                    sslEnabled: false,
                }),
                Lead_1.Lead.countDocuments({
                    ...dateQuery,
                    $or: [
                        { website: { $exists: false } },
                        { website: null },
                        { website: '' },
                    ],
                }),
                Lead_1.Lead.aggregate([
                    { $match: dateQuery },
                    { $project: { emailArray: { $ifNull: ['$emails', []] } } },
                    { $group: { _id: null, count: { $sum: { $size: '$emailArray' } } } },
                ]),
                Lead_1.Lead.aggregate([
                    { $match: dateQuery },
                    { $project: { phoneArray: { $ifNull: ['$phones', []] } } },
                    { $group: { _id: null, count: { $sum: { $size: '$phoneArray' } } } },
                ]),
                Lead_1.Lead.countDocuments({
                    ...dateQuery,
                    website: { $exists: true, $nin: [null, ''] },
                }),
                Automation_1.Automation.countDocuments(),
                Automation_1.ExportHistory.countDocuments(),
            ]);
            const emailsFound = emailsAgg.length > 0 ? emailsAgg[0].count : 0;
            const phoneNumbers = phonesAgg.length > 0 ? phonesAgg[0].count : 0;
            const websitesAnalyzed = websitesAgg;
            const totalScrapes = await Lead_1.Lead.countDocuments({
                ...dateQuery,
                source: 'google-maps',
            });
            const scrapingSuccessRate = totalScrapes > 0 ? 100 : 0;
            const [responsiveAudited, avgResponsiveAgg, mobileUnfriendlyWebsites, layoutIssuesDetected,] = await Promise.all([
                Lead_1.Lead.countDocuments({ responsiveAuditCompleted: true }),
                Lead_1.Lead.aggregate([
                    { $match: { responsiveAuditCompleted: true } },
                    { $group: { _id: null, avgScore: { $avg: '$responsiveScore' } } },
                ]),
                Lead_1.Lead.countDocuments({ 'responsiveAudit.mobileFriendly': false }),
                Lead_1.Lead.countDocuments({ 'responsiveAudit.responsiveLayout': false }),
            ]);
            const [intelligenceAnalyzed, avgTrustAgg, avgQualityAgg, highOpportunityLeads, outdatedWebsites, businessesWithoutSocial, salesIntelligenceAnalyzed, urgentSalesLeads, highConversionLeads, avgAiScoreAgg, highSeoOpportunities, highRedesignOpportunities,] = await Promise.all([
                Lead_1.Lead.countDocuments({ intelligenceCompleted: true }),
                Lead_1.Lead.aggregate([
                    { $match: { intelligenceCompleted: true } },
                    { $group: { _id: null, avgScore: { $avg: '$trustScore' } } },
                ]),
                Lead_1.Lead.aggregate([
                    { $match: { intelligenceCompleted: true } },
                    { $group: { _id: null, avgScore: { $avg: '$websiteQualityScore' } } },
                ]),
                Lead_1.Lead.countDocuments({ 'businessOpportunity.level': 'high' }),
                Lead_1.Lead.countDocuments({
                    'websiteFreshness.status': { $in: ['outdated', 'very-outdated'] },
                }),
                Lead_1.Lead.countDocuments({ socialPresenceScore: { $lt: 40 } }),
                Lead_1.Lead.countDocuments({ salesIntelligenceCompleted: true }),
                Lead_1.Lead.countDocuments({ salesPriority: 'urgent' }),
                Lead_1.Lead.countDocuments({ conversionProbability: 'high' }),
                Lead_1.Lead.aggregate([
                    { $match: { salesIntelligenceCompleted: true } },
                    { $group: { _id: null, avgScore: { $avg: '$aiLeadScore' } } },
                ]),
                Lead_1.Lead.countDocuments({ seoOpportunity: 'high' }),
                Lead_1.Lead.countDocuments({ websiteRedesignPotential: 'high' }),
            ]);
            const [outreachCompleted, pendingOutreach, highProbabilityOutreach, outreachResponded, outreachInterested,] = await Promise.all([
                Lead_1.Lead.countDocuments({ outreachCompleted: true }),
                Lead_1.Lead.countDocuments({ $or: [{ outreachCompleted: { $ne: true } }, { outreachCompleted: { $exists: false } }] }),
                Lead_1.Lead.countDocuments({ outreachProbability: 'high' }),
                Lead_1.Lead.countDocuments({ 'outreachHistory.status': 'responded' }),
                Lead_1.Lead.countDocuments({ crmOutreachStatus: 'interested' }),
            ]);
            const [fullPipelineCompleted, pendingFullPipeline,] = await Promise.all([
                Lead_1.Lead.countDocuments({
                    responsiveAuditCompleted: true,
                    intelligenceCompleted: true,
                    salesIntelligenceCompleted: true,
                    outreachCompleted: true,
                }),
                Lead_1.Lead.countDocuments({
                    $or: [
                        { responsiveAuditCompleted: { $ne: true } },
                        { responsiveAuditCompleted: { $exists: false } },
                    ],
                }),
            ]);
            logger_1.logger.info(`AnalyticsService: Overview - totalLeads=${totalLeads}, websitesAnalyzed=${websitesAnalyzed}, emailsFound=${emailsFound}, phoneNumbers=${phoneNumbers}`);
            return {
                totalLeads,
                websitesAnalyzed,
                emailsFound,
                phoneNumbers,
                totalAutomations,
                highPotentialLeads,
                websitesWithoutSsl,
                noWebsiteBusinesses,
                emailsExtracted: emailsFound,
                automationRuns: totalAutomations,
                exportsGenerated: totalExports,
                totalScrapes,
                scrapingSuccessRate,
                responsiveAudited,
                averageResponsiveScore: Math.round(avgResponsiveAgg[0]?.avgScore || 0),
                averageUIUXScore: Math.round(avgResponsiveAgg[0]?.avgScore || 0),
                mobileUnfriendlyWebsites,
                layoutIssuesDetected,
                intelligenceAnalyzed,
                averageTrustScore: Math.round(avgTrustAgg[0]?.avgScore || 0),
                averageQualityScore: Math.round(avgQualityAgg[0]?.avgScore || 0),
                highOpportunityLeads,
                outdatedWebsites,
                businessesWithoutSocial,
                salesIntelligenceAnalyzed,
                urgentSalesLeads,
                highConversionLeads,
                averageAiScore: Math.round(avgAiScoreAgg[0]?.avgScore || 0),
                highSeoOpportunities,
                highRedesignOpportunities,
                outreachCompleted,
                pendingOutreach,
                highProbabilityOutreach,
                outreachResponded,
                outreachInterested,
                fullPipelineCompleted,
                pendingFullPipeline,
            };
        }
        catch (error) {
            logger_1.logger.error('AnalyticsService: Failed to get overview:', error);
            throw new Error(`Failed to get overview analytics: ${error.message}`);
        }
    }
    async getLeadAnalytics(filter = {}) {
        try {
            const dateQuery = this.getDateRangeQuery(filter);
            const [totalLeads, highPotential, mediumPotential, lowPotential, averageScore,] = await Promise.all([
                Lead_1.Lead.countDocuments({ ...dateQuery }),
                Lead_1.Lead.countDocuments({ ...dateQuery, qualificationLevel: 'high-potential' }),
                Lead_1.Lead.countDocuments({ ...dateQuery, qualificationLevel: 'medium-potential' }),
                Lead_1.Lead.countDocuments({ ...dateQuery, qualificationLevel: 'low-potential' }),
                Lead_1.Lead.aggregate([
                    { $match: dateQuery },
                    { $group: { _id: null, avgScore: { $avg: '$leadScore' } } },
                ]),
            ]);
            const avgScore = averageScore.length > 0 ? averageScore[0].avgScore : 0;
            return {
                totalLeads,
                highPotential,
                mediumPotential,
                lowPotential,
                averageLeadScore: Math.round(avgScore * 100) / 100,
                qualificationDistribution: {
                    highPotential,
                    mediumPotential,
                    lowPotential,
                    total: totalLeads,
                },
            };
        }
        catch (error) {
            logger_1.logger.error('AnalyticsService: Failed to get lead analytics:', error);
            throw new Error(`Failed to get lead analytics: ${error.message}`);
        }
    }
    async getScrapingAnalytics(filter = {}) {
        try {
            const dateQuery = this.getDateRangeQuery(filter);
            const [totalScrapes, successfulScrapes, failedScrapes, avgLeadsPerScrape,] = await Promise.all([
                Lead_1.Lead.countDocuments({ ...dateQuery, source: 'google-maps' }),
                Lead_1.Lead.countDocuments({
                    ...dateQuery,
                    source: 'google-maps',
                    leadScore: { $gte: 50 },
                }),
                Lead_1.Lead.countDocuments({
                    ...dateQuery,
                    source: 'google-maps',
                    leadScore: { $lt: 50 },
                }),
                Lead_1.Lead.aggregate([
                    { $match: dateQuery },
                    { $group: { _id: null, avgLeads: { $avg: '$leadScore' } } },
                ]),
            ]);
            const successRate = totalScrapes > 0
                ? Math.round((successfulScrapes / totalScrapes) * 100)
                : 0;
            return {
                totalScrapes,
                successfulScrapes,
                failedScrapes,
                successRate,
                leadsPerScrape: Math.round(avgLeadsPerScrape[0]?.avgLeads || 0),
            };
        }
        catch (error) {
            logger_1.logger.error('AnalyticsService: Failed to get scraping analytics:', error);
            throw new Error(`Failed to get scraping analytics: ${error.message}`);
        }
    }
    async getAutomationAnalytics(filter = {}) {
        try {
            const dateQuery = this.getDateRangeQuery(filter);
            const [totalRuns, successfulRuns, failedRuns, totalLeadsGenerated, exportsGenerated,] = await Promise.all([
                Automation_1.AutomationHistory.countDocuments(dateQuery),
                Automation_1.AutomationHistory.countDocuments({
                    ...dateQuery,
                    status: 'success',
                }),
                Automation_1.AutomationHistory.countDocuments({
                    ...dateQuery,
                    status: 'failed',
                }),
                Automation_1.AutomationHistory.aggregate([
                    { $match: dateQuery },
                    { $group: { _id: null, totalLeads: { $sum: '$totalLeadsGenerated' } } },
                ]),
                Automation_1.ExportHistory.countDocuments(dateQuery),
            ]);
            const successRate = totalRuns > 0
                ? Math.round((successfulRuns / totalRuns) * 100)
                : 0;
            return {
                totalRuns,
                successfulRuns,
                failedRuns,
                successRate,
                totalLeadsGenerated: totalLeadsGenerated[0]?.totalLeads || 0,
                exportsGenerated,
            };
        }
        catch (error) {
            logger_1.logger.error('AnalyticsService: Failed to get automation analytics:', error);
            throw new Error(`Failed to get automation analytics: ${error.message}`);
        }
    }
    async getCategoryDistribution(filter = {}) {
        try {
            const dateQuery = this.getDateRangeQuery(filter);
            const results = await Lead_1.Lead.aggregate([
                { $match: dateQuery },
                { $group: { _id: '$category', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 20 },
            ]);
            return results;
        }
        catch (error) {
            logger_1.logger.error('AnalyticsService: Failed to get category distribution:', error);
            throw new Error(`Failed to get category distribution: ${error.message}`);
        }
    }
    async getLeadsPerDay(filter = {}) {
        try {
            const dateQuery = this.getDateRangeQuery(filter);
            const results = await Lead_1.Lead.aggregate([
                { $match: dateQuery },
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' },
                            day: { $dayOfMonth: '$createdAt' },
                        },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
                { $limit: 30 },
            ]);
            return results;
        }
        catch (error) {
            logger_1.logger.error('AnalyticsService: Failed to get leads per day:', error);
            throw new Error(`Failed to get leads per day: ${error.message}`);
        }
    }
    async getQualificationDistribution(filter = {}) {
        try {
            const dateQuery = this.getDateRangeQuery(filter);
            const results = await Lead_1.Lead.aggregate([
                { $match: dateQuery },
                {
                    $group: {
                        _id: '$qualificationLevel',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } },
            ]);
            return results;
        }
        catch (error) {
            logger_1.logger.error('AnalyticsService: Failed to get qualification distribution:', error);
            throw new Error(`Failed to get qualification distribution: ${error.message}`);
        }
    }
    async getWebsiteStatusDistribution(filter = {}) {
        try {
            const dateQuery = this.getDateRangeQuery(filter);
            const results = await Lead_1.Lead.aggregate([
                { $match: { ...dateQuery, websiteStatus: { $ne: null } } },
                {
                    $group: {
                        _id: '$websiteStatus',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } },
            ]);
            return results;
        }
        catch (error) {
            logger_1.logger.error('AnalyticsService: Failed to get website status distribution:', error);
            throw new Error(`Failed to get website status distribution: ${error.message}`);
        }
    }
    async getAreaDensity(filter = {}) {
        try {
            const dateQuery = this.getDateRangeQuery(filter);
            const results = await Lead_1.Lead.aggregate([
                { $match: { ...dateQuery, searchedArea: { $exists: true, $nin: [null, ''] } } },
                {
                    $group: {
                        _id: {
                            state: '$searchedState',
                            city: '$searchedCity',
                            area: '$searchedArea',
                        },
                        totalLeads: { $sum: 1 },
                        categories: { $push: '$category' },
                    },
                },
                {
                    $addFields: {
                        densityLevel: {
                            $cond: [{ $gte: ['$totalLeads', 150] }, 'high',
                                { $cond: [{ $gte: ['$totalLeads', 51] }, 'medium', 'low'] }
                            ],
                        },
                    },
                },
                { $sort: { totalLeads: -1 } },
            ]);
            return results.map((r) => {
                const catCount = {};
                for (const cat of r.categories.filter(Boolean)) {
                    catCount[cat] = (catCount[cat] || 0) + 1;
                }
                const topCategories = Object.entries(catCount)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([category, count]) => ({ category, count }));
                return {
                    state: r._id.state || '',
                    city: r._id.city || '',
                    area: r._id.area || '',
                    totalLeads: r.totalLeads,
                    densityLevel: r.densityLevel,
                    topCategories,
                };
            });
        }
        catch (error) {
            logger_1.logger.error('AnalyticsService: Failed to get area density:', error);
            throw new Error(`Failed to get area density: ${error.message}`);
        }
    }
    async getTopAreas(filter = {}, limit = 10) {
        try {
            const density = await this.getAreaDensity(filter);
            return density.slice(0, limit);
        }
        catch (error) {
            logger_1.logger.error('AnalyticsService: Failed to get top areas:', error);
            throw new Error(`Failed to get top areas: ${error.message}`);
        }
    }
    async getTopLocations(filter = {}) {
        try {
            const dateQuery = this.getDateRangeQuery(filter);
            const results = await Lead_1.Lead.aggregate([
                { $match: dateQuery },
                {
                    $group: {
                        _id: '$address',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } },
                { $limit: 10 },
            ]);
            return results;
        }
        catch (error) {
            logger_1.logger.error('AnalyticsService: Failed to get top locations:', error);
            throw new Error(`Failed to get top locations: ${error.message}`);
        }
    }
    async getHighestScoringBusinesses(filter = {}, limit = 10) {
        try {
            const dateQuery = this.getDateRangeQuery(filter);
            return await Lead_1.Lead.find(dateQuery, {
                companyName: 1, website: 1, category: 1, source: 1, leadScore: 1,
                rating: 1, email: 1, phone: 1, searchedState: 1, searchedCity: 1,
            })
                .sort({ leadScore: -1, rating: -1 })
                .limit(limit)
                .lean();
        }
        catch (error) {
            logger_1.logger.error('AnalyticsService: Failed to get highest scoring businesses:', error);
            throw new Error(`Failed to get highest scoring businesses: ${error.message}`);
        }
    }
    async getRecentScrapingHistory(limit = 10) {
        try {
            return await Lead_1.Lead.find({ source: 'google-maps' }, {
                companyName: 1, website: 1, category: 1, source: 1, email: 1,
                phone: 1, searchedState: 1, searchedCity: 1, createdAt: 1,
            })
                .sort({ createdAt: -1 })
                .limit(limit)
                .lean();
        }
        catch (error) {
            logger_1.logger.error('AnalyticsService: Failed to get recent scraping history:', error);
            throw new Error(`Failed to get recent scraping history: ${error.message}`);
        }
    }
    getDateRangeQuery(filter) {
        const query = {};
        if (filter.startDate && filter.endDate) {
            query.createdAt = { $gte: filter.startDate, $lte: filter.endDate };
        }
        else if (filter.startDate) {
            query.createdAt = { $gte: filter.startDate };
        }
        else if (filter.endDate) {
            query.createdAt = { $lte: filter.endDate };
        }
        return query;
    }
}
exports.AnalyticsService = AnalyticsService;
exports.analyticsService = new AnalyticsService();
//# sourceMappingURL=analytics.service.js.map