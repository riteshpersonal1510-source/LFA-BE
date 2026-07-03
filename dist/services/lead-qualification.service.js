"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadQualificationService = exports.LeadQualificationService = void 0;
const logger_1 = require("../utils/logger");
const Lead_1 = require("../models/Lead");
const website_analyzer_service_1 = require("./website-analyzer.service");
class LeadQualificationService {
    async qualifyLead(leadId, website) {
        if (!website) {
            logger_1.logger.warn(`Lead ${leadId}: No website provided for qualification`);
            return null;
        }
        try {
            const leadAnalysis = await website_analyzer_service_1.websiteAnalyzerService.analyzeLead(leadId, website);
            const lead = await Lead_1.Lead.findById(leadId);
            if (!lead) {
                logger_1.logger.warn(`Lead not found: ${leadId}`);
                return null;
            }
            lead.websiteStatus = leadAnalysis.websiteStatus;
            lead.leadScore = leadAnalysis.leadScore;
            lead.qualificationLevel = leadAnalysis.qualificationLevel;
            lead.sslEnabled = leadAnalysis.analysisData.sslEnabled;
            lead.responseTime = leadAnalysis.analysisData.responseTime;
            lead.metaTitle = leadAnalysis.analysisData.metaTitle;
            lead.metaDescription = leadAnalysis.analysisData.metaDescription;
            lead.hasContactPage = leadAnalysis.analysisData.hasContactPage;
            lead.hasSocialLinks = leadAnalysis.analysisData.hasSocialLinks;
            lead.analyzedAt = new Date(leadAnalysis.analyzedAt);
            await lead.save();
            logger_1.logger.info(`Lead ${leadId} qualified: Score=${lead.leadScore}, Status=${lead.websiteStatus}, Level=${lead.qualificationLevel}`);
            return lead;
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), `Failed to qualify lead ${leadId}:`);
            const lead = await Lead_1.Lead.findById(leadId);
            if (lead) {
                lead.websiteStatus = 'broken-website';
                lead.leadScore = 90;
                lead.qualificationLevel = 'low-potential';
                lead.analyzedAt = new Date();
                await lead.save();
            }
            return null;
        }
    }
    async bulkQualifyLeads(options = {}) {
        const { limit = 50, websiteStatus, minLeadScore } = options;
        logger_1.logger.info(`Bulk qualifying leads (limit: ${limit}, status: ${websiteStatus}, minScore: ${minLeadScore})`);
        const query = {
            website: { $exists: true, $ne: null },
            $or: [
                { website: { $ne: '' } },
                { website: { $exists: false } },
            ],
        };
        if (websiteStatus) {
            query.websiteStatus = websiteStatus;
        }
        if (minLeadScore !== undefined) {
            query.leadScore = { $lt: minLeadScore };
        }
        const leads = await Lead_1.Lead.find(query)
            .limit(limit)
            .lean();
        if (leads.length === 0) {
            logger_1.logger.info('No leads found matching criteria');
            return {
                success: true,
                message: 'No leads found matching criteria',
                totalAnalyzed: 0,
                results: [],
            };
        }
        logger_1.logger.info(`Found ${leads.length} leads to qualify`);
        const results = [];
        let successful = 0;
        let failed = 0;
        for (const lead of leads) {
            try {
                const website = lead.website || '';
                if (!website) {
                    failed++;
                    continue;
                }
                const leadAnalysis = await website_analyzer_service_1.websiteAnalyzerService.analyzeLead(lead.id, website);
                await Lead_1.Lead.findByIdAndUpdate(lead.id, {
                    websiteStatus: leadAnalysis.websiteStatus,
                    leadScore: leadAnalysis.leadScore,
                    qualificationLevel: leadAnalysis.qualificationLevel,
                    sslEnabled: leadAnalysis.analysisData.sslEnabled,
                    responseTime: leadAnalysis.analysisData.responseTime,
                    metaTitle: leadAnalysis.analysisData.metaTitle,
                    metaDescription: leadAnalysis.analysisData.metaDescription,
                    hasContactPage: leadAnalysis.analysisData.hasContactPage,
                    hasSocialLinks: leadAnalysis.analysisData.hasSocialLinks,
                    analyzedAt: new Date(leadAnalysis.analyzedAt),
                    updatedAt: new Date(),
                });
                results.push(leadAnalysis);
                successful++;
                logger_1.logger.info(`Qualified lead ${lead.id}: Score=${leadAnalysis.leadScore}, Status=${leadAnalysis.websiteStatus}, Level=${leadAnalysis.qualificationLevel}`);
            }
            catch (error) {
                logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), `Failed to qualify lead ${lead.id}:`);
                failed++;
            }
        }
        logger_1.logger.info(`Bulk qualification completed: ${successful} successful, ${failed} failed`);
        return {
            success: true,
            message: `Qualified ${successful} leads, ${failed} failed`,
            totalAnalyzed: successful,
            results,
        };
    }
    async getQualifiedLeads(options = {}) {
        const { page = 1, limit = 10, qualificationLevel, websiteStatus, minLeadScore, maxLeadScore, } = options;
        logger_1.logger.info(`Fetching qualified leads (page: ${page}, limit: ${limit})`);
        const query = {};
        if (qualificationLevel) {
            query.qualificationLevel = qualificationLevel;
        }
        if (websiteStatus) {
            query.websiteStatus = websiteStatus;
        }
        if (minLeadScore !== undefined || maxLeadScore !== undefined) {
            query.leadScore = {};
            if (minLeadScore !== undefined) {
                query.leadScore.$gte = minLeadScore;
            }
            if (maxLeadScore !== undefined) {
                query.leadScore.$lte = maxLeadScore;
            }
        }
        const skip = (page - 1) * limit;
        const [leads, total] = await Promise.all([
            Lead_1.Lead.find(query)
                .sort({ leadScore: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Lead_1.Lead.countDocuments(query),
        ]);
        const totalPages = Math.ceil(total / limit);
        logger_1.logger.info(`Returned ${leads.length} leads out of ${total} total qualified leads`);
        return {
            leads,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    }
    async getQualificationStats() {
        const totalLeads = await Lead_1.Lead.countDocuments();
        const qualifiedLeads = await Lead_1.Lead.countDocuments({ leadScore: { $gt: 0 } });
        const statusAggregation = await Lead_1.Lead.aggregate([
            {
                $match: { websiteStatus: { $ne: null } },
            },
            {
                $group: {
                    _id: '$websiteStatus',
                    count: { $sum: 1 },
                },
            },
        ]);
        const levelAggregation = await Lead_1.Lead.aggregate([
            {
                $match: { qualificationLevel: { $ne: null } },
            },
            {
                $group: {
                    _id: '$qualificationLevel',
                    count: { $sum: 1 },
                },
            },
        ]);
        const scoreAggregation = await Lead_1.Lead.aggregate([
            {
                $match: { leadScore: { $gt: 0 } },
            },
            {
                $group: {
                    _id: null,
                    avgScore: { $avg: '$leadScore' },
                },
            },
        ]);
        const byStatus = {};
        for (const item of statusAggregation) {
            byStatus[item._id] = item.count;
        }
        const byLevel = {};
        for (const item of levelAggregation) {
            byLevel[item._id] = item.count;
        }
        const avgScore = scoreAggregation.length > 0 ? Math.round(scoreAggregation[0].avgScore) : 0;
        return {
            totalLeads,
            qualifiedLeads,
            byStatus,
            byLevel,
            avgScore,
        };
    }
    async getLeadsByLevel(level) {
        const leads = await Lead_1.Lead.find({ qualificationLevel: level })
            .sort({ leadScore: -1, createdAt: -1 });
        logger_1.logger.info(`Found ${leads.length} leads with level: ${level}`);
        return leads;
    }
    async getLeadsByStatus(status) {
        const leads = await Lead_1.Lead.find({ websiteStatus: status })
            .sort({ leadScore: -1, createdAt: -1 });
        logger_1.logger.info(`Found ${leads.length} leads with status: ${status}`);
        return leads;
    }
    async requalifyUnanalyzedLeads(options = {}) {
        const { limit = 50 } = options;
        logger_1.logger.info('Re-qualifying unanalyzed leads');
        const unanalyzedLeads = await Lead_1.Lead.find({
            $or: [
                { leadScore: 0 },
                { leadScore: { $exists: false } },
                { analyzedAt: { $exists: false } },
            ],
        })
            .limit(limit);
        if (unanalyzedLeads.length === 0) {
            logger_1.logger.info('All leads are already analyzed');
            return {
                success: true,
                message: 'All leads are already analyzed',
                totalAnalyzed: 0,
                results: [],
            };
        }
        const result = await this.bulkQualifyLeads({
            limit,
            websiteStatus: undefined,
        });
        return result;
    }
}
exports.LeadQualificationService = LeadQualificationService;
exports.leadQualificationService = new LeadQualificationService();
//# sourceMappingURL=lead-qualification.service.js.map