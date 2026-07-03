"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fixAllWebsiteClassifications = fixAllWebsiteClassifications;
const Lead_1 = require("../models/Lead");
const logger_1 = require("../utils/logger");
const urlClassifier_service_1 = require("../modules/leads/services/urlClassifier.service");
async function fixAllWebsiteClassifications(batchSize = 200) {
    const total = await Lead_1.Lead.countDocuments({});
    let updated = 0;
    let corrected = 0;
    let socialProfiles = 0;
    let businessWebsites = 0;
    let noWebsite = 0;
    let skip = 0;
    logger_1.logger.info(`[v2 Migration] Starting fixAllWebsiteClassifications for ${total} leads`);
    while (skip < total) {
        const batch = await Lead_1.Lead.find({})
            .skip(skip)
            .limit(batchSize)
            .lean();
        if (batch.length === 0)
            break;
        const bulkOps = [];
        for (const lead of batch) {
            const leadRecord = lead;
            const website = leadRecord.website;
            const classified = (0, urlClassifier_service_1.classifyWebsiteUrl)(website || null);
            const hasRealWebsite = classified.hasRealWebsite;
            const oldHasWebsite = leadRecord.hasWebsite;
            const updateFields = {
                hasWebsite: hasRealWebsite,
                hasRealWebsite: hasRealWebsite,
                websiteType: classified.websiteType,
                websiteClassification: classified.websiteType === 'REAL_WEBSITE' ? 'business_website'
                    : classified.websiteType === 'SOCIAL_PROFILE' ? 'social_profile'
                        : classified.websiteType === 'GOOGLE_PROFILE' ? 'google_business_profile'
                            : classified.websiteType === 'MARKETPLACE_PROFILE' || classified.websiteType === 'DIRECTORY_PROFILE' ? 'directory_listing'
                                : 'no_website',
                websiteAuditAllowed: hasRealWebsite,
                analysisEligible: hasRealWebsite,
            };
            if (classified.normalizedUrl) {
                updateFields.normalizedDomain = classified.normalizedUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
            }
            else {
                updateFields.normalizedDomain = null;
            }
            const oldIncorrect = oldHasWebsite === true && !hasRealWebsite;
            if (oldIncorrect) {
                corrected++;
            }
            if (hasRealWebsite) {
                businessWebsites++;
            }
            else if (classified.websiteType === 'SOCIAL_PROFILE' || classified.websiteType === 'GOOGLE_PROFILE' || classified.websiteType === 'MARKETPLACE_PROFILE' || classified.websiteType === 'DIRECTORY_PROFILE') {
                socialProfiles++;
            }
            else {
                noWebsite++;
            }
            bulkOps.push({
                updateOne: {
                    filter: { _id: leadRecord._id },
                    update: { $set: updateFields },
                },
            });
            updated++;
        }
        if (bulkOps.length > 0) {
            await Lead_1.Lead.bulkWrite(bulkOps);
            logger_1.logger.info(`[v2 Migration] Processed ${updated}/${total} leads (${corrected} corrections so far)`);
        }
        skip += batchSize;
    }
    const stats = { total, updated, corrected, socialProfiles, businessWebsites, noWebsite };
    logger_1.logger.info(`[v2 Migration] fixAllWebsiteClassifications complete: ${JSON.stringify(stats)}`);
    return stats;
}
//# sourceMappingURL=v2-fix-all-website-classifications.js.map