"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fixLeadWebsites = fixLeadWebsites;
const Lead_1 = require("../models/Lead");
const logger_1 = require("../utils/logger");
const website_analysis_service_1 = require("../services/website-analysis.service");
async function fixLeadWebsites(batchSize = 200) {
    const total = await Lead_1.Lead.countDocuments({});
    let updated = 0;
    let eligible = 0;
    let nonEligible = 0;
    let noWebsite = 0;
    let skip = 0;
    logger_1.logger.info(`[Migration] Starting fixLeadWebsites migration for ${total} leads`);
    while (skip < total) {
        const batch = await Lead_1.Lead.find({})
            .skip(skip)
            .limit(batchSize)
            .lean();
        if (batch.length === 0)
            break;
        const bulkOps = [];
        for (const lead of batch) {
            const website = lead.website;
            const analysis = website_analysis_service_1.websiteAnalysisService.getLeadFields(website);
            const updateFields = {
                hasWebsite: analysis.hasWebsite,
                normalizedDomain: analysis.normalizedDomain,
                analysisEligible: analysis.analysisEligible,
                hasRealWebsite: analysis.hasRealWebsite,
                websiteType: analysis.websiteType,
                websiteAuditAllowed: analysis.websiteAuditAllowed,
            };
            if (analysis.website) {
                updateFields.website = analysis.website;
            }
            if (analysis.analysisEligible) {
                eligible++;
            }
            else if (analysis.hasWebsite) {
                nonEligible++;
            }
            else {
                noWebsite++;
            }
            bulkOps.push({
                updateOne: {
                    filter: { _id: lead._id },
                    update: { $set: updateFields },
                },
            });
            updated++;
        }
        if (bulkOps.length > 0) {
            await Lead_1.Lead.bulkWrite(bulkOps);
            logger_1.logger.info(`[Migration] Processed ${updated}/${total} leads`);
        }
        skip += batchSize;
    }
    const stats = { total, updated, eligible, nonEligible, noWebsite };
    logger_1.logger.info(`[Migration] fixLeadWebsites complete: ${JSON.stringify(stats)}`);
    return stats;
}
//# sourceMappingURL=fix-lead-websites.js.map