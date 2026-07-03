"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadMigrationService = exports.LeadMigrationService = void 0;
const Lead_1 = require("../models/Lead");
const website_analysis_service_1 = require("./website-analysis.service");
const lead_audit_processor_service_1 = require("./lead-audit-processor.service");
const logger_1 = require("../utils/logger");
class LeadMigrationService {
    async reclassifyAllLeads(batchSize = 100) {
        const stats = {
            total: 0,
            processed: 0,
            classified: 0,
            realWebsites: 0,
            socialOnly: 0,
            googleOnly: 0,
            marketplaceOnly: 0,
            directoryOnly: 0,
            invalidUrls: 0,
            noWebsite: 0,
        };
        const totalLeads = await Lead_1.Lead.countDocuments({});
        stats.total = totalLeads;
        logger_1.logger.info(`[LeadMigration] Starting reclassification of ${totalLeads} leads`);
        let skip = 0;
        while (skip < totalLeads) {
            const batch = await Lead_1.Lead.find({})
                .skip(skip)
                .limit(batchSize)
                .lean();
            if (batch.length === 0)
                break;
            const bulkOps = [];
            for (const lead of batch) {
                const website = lead.website;
                if (!website) {
                    stats.noWebsite++;
                    stats.processed++;
                    const updateFields = {
                        websiteType: 'NO_WEBSITE',
                        websiteStatus: 'NO_REAL_WEBSITE',
                        hasRealWebsite: false,
                        hasWebsite: false,
                        websitePresence: 'NO',
                        detectedWebsiteType: 'UNKNOWN',
                        websiteAuditAllowed: false,
                        websiteClassification: 'no_website',
                    };
                    bulkOps.push({
                        updateOne: {
                            filter: { _id: lead._id },
                            update: { $set: updateFields },
                        },
                    });
                    continue;
                }
                const analysis = website_analysis_service_1.websiteAnalysisService.getLeadFields(website);
                const updateFields = {
                    website: analysis.website,
                    hasWebsite: analysis.hasWebsite,
                    normalizedDomain: analysis.normalizedDomain,
                    analysisEligible: analysis.analysisEligible,
                    hasRealWebsite: analysis.hasRealWebsite,
                    websiteType: analysis.websiteType,
                    websiteAuditAllowed: analysis.websiteAuditAllowed,
                };
                if (analysis.analysisEligible)
                    stats.realWebsites++;
                else if (analysis.hasWebsite)
                    stats.socialOnly++;
                else
                    stats.noWebsite++;
                bulkOps.push({
                    updateOne: {
                        filter: { _id: lead._id },
                        update: { $set: updateFields },
                    },
                });
                stats.classified++;
                stats.processed++;
            }
            if (bulkOps.length > 0) {
                await Lead_1.Lead.bulkWrite(bulkOps);
                logger_1.logger.info(`[LeadMigration] Processed ${stats.processed}/${totalLeads} leads`);
            }
            skip += batchSize;
        }
        logger_1.logger.info(`[LeadMigration] Migration complete: ${JSON.stringify(stats)}`);
        const leadsToReaudit = await Lead_1.Lead.find({
            $and: [
                { website: { $exists: true, $nin: [null, ''] } },
                { $or: [
                        { hasRealWebsite: true },
                        { hasRealWebsite: { $exists: false } },
                    ] },
            ],
            $or: [
                { 'auditStatus.overall': { $ne: 'completed' } },
                { auditStatus: { $exists: false } },
            ],
        })
            .select('_id website')
            .lean();
        if (leadsToReaudit.length > 0) {
            logger_1.logger.info(`[LeadMigration] Enqueuing ${leadsToReaudit.length} real website leads for re-audit`);
            lead_audit_processor_service_1.leadAuditProcessor.enqueueMany(leadsToReaudit.map(l => ({
                leadId: l._id.toString(),
                website: l.website || '',
            })));
        }
        return stats;
    }
    async getClassificationStats() {
        const total = await Lead_1.Lead.countDocuments({});
        const withWebsite = await Lead_1.Lead.countDocuments({ website: { $exists: true, $nin: [null, ''] } });
        const realWebsites = await Lead_1.Lead.countDocuments({ websiteType: 'REAL_WEBSITE' });
        const socialOnly = await Lead_1.Lead.countDocuments({ websiteType: 'SOCIAL_PROFILE' });
        const googleOnly = await Lead_1.Lead.countDocuments({ websiteType: 'GOOGLE_PROFILE' });
        const marketplaceOnly = await Lead_1.Lead.countDocuments({ websiteType: { $in: ['MARKETPLACE_PROFILE', 'DIRECTORY_PROFILE'] } });
        const noWebsite = total - withWebsite;
        return { total, withWebsite, realWebsites, socialOnly, googleOnly, marketplaceOnly, noWebsite };
    }
    async migrateWebsiteDetectionFields(batchSize = 200) {
        let processed = 0;
        let updated = 0;
        while (true) {
            const batch = await Lead_1.Lead.find({
                $or: [
                    { analysisEligible: { $exists: false } },
                    { normalizedDomain: { $exists: false } },
                ],
            })
                .limit(batchSize)
                .select('_id website')
                .lean();
            if (batch.length === 0)
                break;
            const bulkOps = [];
            for (const lead of batch) {
                const analysis = website_analysis_service_1.websiteAnalysisService.getLeadFields(lead.website);
                bulkOps.push({
                    updateOne: {
                        filter: { _id: lead._id },
                        update: {
                            $set: {
                                hasWebsite: analysis.hasWebsite,
                                hasRealWebsite: analysis.hasRealWebsite,
                                normalizedDomain: analysis.normalizedDomain,
                                analysisEligible: analysis.analysisEligible,
                                websiteType: analysis.websiteType,
                                websiteAuditAllowed: analysis.websiteAuditAllowed,
                            },
                        },
                    },
                });
                processed++;
                updated++;
            }
            if (bulkOps.length > 0) {
                await Lead_1.Lead.bulkWrite(bulkOps);
            }
            if (batch.length < batchSize)
                break;
        }
        logger_1.logger.info({ processed, updated }, '[LeadMigration] Website analysis fields migration complete');
        return { processed, updated };
    }
}
exports.LeadMigrationService = LeadMigrationService;
exports.leadMigrationService = new LeadMigrationService();
//# sourceMappingURL=lead-migration.service.js.map