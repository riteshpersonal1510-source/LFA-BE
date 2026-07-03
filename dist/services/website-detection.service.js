"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.websiteDetectionService = exports.WebsiteDetectionService = void 0;
const urlClassifier_service_1 = require("../modules/leads/services/urlClassifier.service");
function getDetectedType(wt) {
    if (wt === 'REAL_WEBSITE')
        return 'STANDALONE';
    if (wt === 'SOCIAL_PROFILE' || wt === 'GOOGLE_PROFILE' || wt === 'MARKETPLACE_PROFILE' || wt === 'DIRECTORY_PROFILE')
        return 'PROFILE_ONLY';
    return 'UNKNOWN';
}
class WebsiteDetectionService {
    detect(url) {
        if (!url || !url.trim()) {
            return { hasWebsite: false, websiteStatus: 'NO', websiteType: 'UNKNOWN', hasRealWebsite: false };
        }
        const classified = (0, urlClassifier_service_1.classifyWebsiteUrl)(url);
        const hasWebsite = classified.hasRealWebsite;
        return {
            hasWebsite,
            websiteStatus: hasWebsite ? 'YES' : 'NO',
            websiteType: getDetectedType(classified.websiteType),
            hasRealWebsite: hasWebsite,
        };
    }
    getLeadFields(url) {
        const classified = (0, urlClassifier_service_1.classifyWebsiteUrl)(url);
        const hasWebsite = classified.hasRealWebsite;
        return {
            hasWebsite,
            websiteStatus: hasWebsite ? 'YES' : 'NO',
            detectedWebsiteType: getDetectedType(classified.websiteType),
            hasRealWebsite: hasWebsite,
            websiteType: classified.websiteType,
            websiteClassification: classified.normalizedUrl ? (classified.websiteType === 'REAL_WEBSITE' ? 'business_website'
                : classified.websiteType === 'SOCIAL_PROFILE' ? 'social_profile'
                    : classified.websiteType === 'GOOGLE_PROFILE' ? 'google_business_profile'
                        : 'directory_listing') : 'no_website',
            websiteAuditAllowed: hasWebsite,
        };
    }
    resolveLeadHasWebsite(lead) {
        if (typeof lead.hasWebsite === 'boolean')
            return lead.hasWebsite;
        if (typeof lead.hasRealWebsite === 'boolean')
            return lead.hasRealWebsite;
        return (0, urlClassifier_service_1.classifyWebsiteUrl)(lead.website).hasRealWebsite;
    }
}
exports.WebsiteDetectionService = WebsiteDetectionService;
exports.websiteDetectionService = new WebsiteDetectionService();
//# sourceMappingURL=website-detection.service.js.map