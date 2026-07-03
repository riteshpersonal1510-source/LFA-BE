"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectPlatform = detectPlatform;
exports.isSocialUrl = isSocialUrl;
exports.isMarketplaceUrl = isMarketplaceUrl;
exports.isMapsUrl = isMapsUrl;
exports.isRealBusinessWebsite = isRealBusinessWebsite;
exports.classifyWebsite = classifyWebsite;
const urlClassifier_service_1 = require("../modules/leads/services/urlClassifier.service");
function detectPlatform(url) {
    const result = (0, urlClassifier_service_1.classifyWebsiteUrl)(url);
    if (result.websiteType === 'SOCIAL_PROFILE') {
        const socialKeys = Object.keys(result.socialProfiles);
        return socialKeys.length > 0 ? socialKeys[0] : null;
    }
    return null;
}
function isSocialUrl(url) {
    return (0, urlClassifier_service_1.classifyWebsiteUrl)(url).websiteType === 'SOCIAL_PROFILE';
}
function isMarketplaceUrl(url) {
    return (0, urlClassifier_service_1.classifyWebsiteUrl)(url).websiteType === 'MARKETPLACE_PROFILE';
}
function isMapsUrl(url) {
    return (0, urlClassifier_service_1.classifyWebsiteUrl)(url).websiteType === 'GOOGLE_PROFILE';
}
function isRealBusinessWebsite(url) {
    return (0, urlClassifier_service_1.classifyWebsiteUrl)(url).hasRealWebsite;
}
function classifyWebsite(url) {
    const result = (0, urlClassifier_service_1.classifyWebsiteUrl)(url);
    const mappedType = result.websiteType === 'REAL_WEBSITE' ? 'business'
        : result.websiteType === 'SOCIAL_PROFILE' ? 'social'
            : result.websiteType === 'GOOGLE_PROFILE' ? 'maps'
                : result.websiteType === 'MARKETPLACE_PROFILE' || result.websiteType === 'DIRECTORY_PROFILE' ? 'marketplace'
                    : 'unknown';
    const mappedClassification = result.websiteType === 'REAL_WEBSITE' ? 'business_website'
        : result.websiteType === 'SOCIAL_PROFILE' ? 'social_profile'
            : result.websiteType === 'GOOGLE_PROFILE' ? 'google_business_profile'
                : result.websiteType === 'MARKETPLACE_PROFILE' || result.websiteType === 'DIRECTORY_PROFILE' ? 'directory_listing'
                    : 'no_website';
    const socialKeys = Object.keys(result.socialProfiles);
    const socialPlatform = socialKeys.length > 0 ? socialKeys[0] : undefined;
    return {
        hasRealWebsite: result.hasRealWebsite,
        websiteType: mappedType,
        socialPlatform,
        websiteClassification: mappedClassification,
        websiteAuditAllowed: result.hasRealWebsite,
    };
}
//# sourceMappingURL=websiteClassifier.js.map