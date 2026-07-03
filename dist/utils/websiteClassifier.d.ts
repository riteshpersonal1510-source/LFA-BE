export type WebsiteClassification = 'business_website' | 'social_profile' | 'google_business_profile' | 'directory_listing' | 'no_website';
export type { WebsiteClassificationType, SocialProfiles, ClassifiedWebsite } from '../modules/leads/services/urlClassifier.service';
export declare function detectPlatform(url: string): string | null;
export declare function isSocialUrl(url: string): boolean;
export declare function isMarketplaceUrl(url: string): boolean;
export declare function isMapsUrl(url: string): boolean;
export declare function isRealBusinessWebsite(url: string): boolean;
export declare function classifyWebsite(url: string): {
    hasRealWebsite: boolean;
    websiteType: 'business' | 'social' | 'marketplace' | 'maps' | 'unknown';
    socialPlatform: string | undefined;
    websiteClassification: WebsiteClassification;
    websiteAuditAllowed: boolean;
};
//# sourceMappingURL=websiteClassifier.d.ts.map