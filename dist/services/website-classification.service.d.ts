import { classifyWebsiteUrl, isRealWebsite, isOnlineProfile, getWebsiteClassification, setLeadClassificationFields } from '../modules/leads/services/urlClassifier.service';
import type { WebsiteClassificationType, ClassifiedWebsite, SocialProfiles, WebsiteClassificationType as WCT } from '../modules/leads/services/urlClassifier.service';
export type WebsiteClassificationResult = 'STANDALONE_WEBSITE' | 'SOCIAL_PROFILE' | 'DIRECTORY_PROFILE' | 'NO_WEBSITE';
export interface WebsiteClassificationOutput {
    classification: WebsiteClassificationResult;
    hasRealWebsite: boolean;
    displayLabel: string;
    domain: string | null;
    originalUrl: string | null;
    normalizedUrl: string | null;
}
export interface LeadWebsiteFields {
    website: string | null;
    websiteType: WebsiteClassificationType;
    websiteClassification: 'business_website' | 'social_profile' | 'google_business_profile' | 'directory_listing' | 'no_website';
    websiteStatus: string;
    hasRealWebsite: boolean;
    websiteAuditAllowed: boolean;
    socialProfiles: Record<string, unknown>;
    socialPlatforms: string[];
    primaryPlatform?: string;
}
export declare class WebsiteClassificationService {
    classify(url: string | null | undefined): WebsiteClassificationOutput;
    isStandaloneWebsite(url: string | null | undefined): boolean;
    getDomain(url: string | null | undefined): string | null;
    getClassificationLabel(url: string | null | undefined): string;
    getDetectedPlatform(url: string | null | undefined): string | null;
    getLeadWebsiteFields(website: string | null | undefined): LeadWebsiteFields;
    isRealWebsite(url: string | null | undefined): boolean;
    classifyWebsiteUrl(url: string | null | undefined): ClassifiedWebsite;
    isOnlineProfile(url: string | null | undefined): boolean;
    getWebsiteClassification(url: string | null | undefined): ReturnType<typeof getWebsiteClassification>;
    setLeadClassificationFields(leadDoc: Record<string, unknown>, website: string | null | undefined): void;
}
export declare const websiteClassificationService: WebsiteClassificationService;
export { classifyWebsiteUrl, isRealWebsite, isOnlineProfile, getWebsiteClassification, setLeadClassificationFields };
export type { WebsiteClassificationType, ClassifiedWebsite, SocialProfiles, WCT as WebsiteClassificationTypeAlias };
//# sourceMappingURL=website-classification.service.d.ts.map