"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setLeadClassificationFields = exports.getWebsiteClassification = exports.isOnlineProfile = exports.isRealWebsite = exports.classifyWebsiteUrl = exports.websiteClassificationService = exports.WebsiteClassificationService = void 0;
const urlClassifier_service_1 = require("../modules/leads/services/urlClassifier.service");
Object.defineProperty(exports, "classifyWebsiteUrl", { enumerable: true, get: function () { return urlClassifier_service_1.classifyWebsiteUrl; } });
Object.defineProperty(exports, "isRealWebsite", { enumerable: true, get: function () { return urlClassifier_service_1.isRealWebsite; } });
Object.defineProperty(exports, "isOnlineProfile", { enumerable: true, get: function () { return urlClassifier_service_1.isOnlineProfile; } });
Object.defineProperty(exports, "getWebsiteClassification", { enumerable: true, get: function () { return urlClassifier_service_1.getWebsiteClassification; } });
Object.defineProperty(exports, "setLeadClassificationFields", { enumerable: true, get: function () { return urlClassifier_service_1.setLeadClassificationFields; } });
class WebsiteClassificationService {
    classify(url) {
        const classified = urlClassifier_service_1.websiteClassificationService.classifyWebsiteUrl(url);
        let classification;
        let displayLabel;
        switch (classified.websiteType) {
            case 'REAL_WEBSITE':
                classification = 'STANDALONE_WEBSITE';
                displayLabel = 'Standalone Website';
                break;
            case 'SOCIAL_PROFILE':
                classification = 'SOCIAL_PROFILE';
                displayLabel = 'Social Profile';
                break;
            case 'GOOGLE_PROFILE':
            case 'MARKETPLACE_PROFILE':
            case 'DIRECTORY_PROFILE':
                classification = 'DIRECTORY_PROFILE';
                displayLabel = classified.displayLabel;
                break;
            default:
                classification = 'NO_WEBSITE';
                displayLabel = 'No Website';
        }
        let domain = null;
        if (classified.normalizedUrl) {
            try {
                domain = new URL(classified.normalizedUrl).hostname.replace(/^www\./, '');
            }
            catch {
                domain = classified.normalizedUrl;
            }
        }
        return {
            classification,
            hasRealWebsite: classified.hasRealWebsite,
            displayLabel,
            domain,
            originalUrl: classified.originalUrl,
            normalizedUrl: classified.normalizedUrl,
        };
    }
    isStandaloneWebsite(url) {
        return this.classify(url).classification === 'STANDALONE_WEBSITE';
    }
    getDomain(url) {
        return this.classify(url).domain;
    }
    getClassificationLabel(url) {
        const result = this.classify(url);
        if (result.classification === 'STANDALONE_WEBSITE') {
            return 'Professional Website Available';
        }
        if (result.classification === 'SOCIAL_PROFILE') {
            return 'Social Media Profile';
        }
        if (result.classification === 'DIRECTORY_PROFILE') {
            return 'Directory Listing';
        }
        return 'No Website';
    }
    getDetectedPlatform(url) {
        const classified = urlClassifier_service_1.websiteClassificationService.classifyWebsiteUrl(url);
        const socialKeys = Object.keys(classified.socialProfiles);
        if (socialKeys.length > 0) {
            return socialKeys[0].charAt(0).toUpperCase() + socialKeys[0].slice(1);
        }
        return null;
    }
    getLeadWebsiteFields(website) {
        const classified = urlClassifier_service_1.websiteClassificationService.classifyWebsiteUrl(website);
        const normalized = classified.normalizedUrl || (website || null);
        const websiteClassification = classified.websiteType === 'REAL_WEBSITE' ? 'business_website'
            : classified.websiteType === 'SOCIAL_PROFILE' ? 'social_profile'
                : classified.websiteType === 'GOOGLE_PROFILE' ? 'google_business_profile'
                    : classified.websiteType === 'MARKETPLACE_PROFILE' || classified.websiteType === 'DIRECTORY_PROFILE' ? 'directory_listing'
                        : 'no_website';
        const socialPlatforms = Object.keys(classified.socialProfiles);
        const primaryPlatform = socialPlatforms.length > 0 ? socialPlatforms[0] : undefined;
        return {
            website: normalized,
            websiteType: classified.websiteType,
            websiteClassification,
            websiteStatus: classified.websiteStatus,
            hasRealWebsite: classified.hasRealWebsite,
            websiteAuditAllowed: classified.hasRealWebsite,
            socialProfiles: classified.socialProfiles,
            socialPlatforms,
            ...(primaryPlatform ? { primaryPlatform } : {}),
        };
    }
    isRealWebsite(url) {
        return urlClassifier_service_1.websiteClassificationService.isRealWebsite(url);
    }
    classifyWebsiteUrl(url) {
        return urlClassifier_service_1.websiteClassificationService.classifyWebsiteUrl(url);
    }
    isOnlineProfile(url) {
        return urlClassifier_service_1.websiteClassificationService.isOnlineProfile(url);
    }
    getWebsiteClassification(url) {
        return urlClassifier_service_1.websiteClassificationService.getWebsiteClassification(url);
    }
    setLeadClassificationFields(leadDoc, website) {
        return urlClassifier_service_1.websiteClassificationService.setLeadClassificationFields(leadDoc, website);
    }
}
exports.WebsiteClassificationService = WebsiteClassificationService;
exports.websiteClassificationService = new WebsiteClassificationService();
//# sourceMappingURL=website-classification.service.js.map