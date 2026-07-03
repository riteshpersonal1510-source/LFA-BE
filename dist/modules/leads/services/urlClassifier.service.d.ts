export type WebsiteClassificationType = 'REAL_WEBSITE' | 'SOCIAL_PROFILE' | 'GOOGLE_PROFILE' | 'MARKETPLACE_PROFILE' | 'DIRECTORY_PROFILE' | 'INVALID_URL' | 'NO_WEBSITE';
export type WebsiteStatusType = 'ACTIVE' | 'NO_REAL_WEBSITE' | 'BROKEN' | 'INVALID' | 'UNKNOWN';
export interface SocialProfiles {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    youtube?: string;
    twitter?: string;
    tiktok?: string;
    whatsapp?: string;
    snapchat?: string;
    pinterest?: string;
    telegram?: string;
    other?: string[];
}
export interface ClassifiedWebsite {
    originalUrl: string | null;
    normalizedUrl: string | null;
    websiteType: WebsiteClassificationType;
    websiteStatus: WebsiteStatusType;
    hasRealWebsite: boolean;
    socialProfiles: SocialProfiles;
    displayLabel: string;
}
export declare function classifyWebsiteUrl(url: string | null | undefined): ClassifiedWebsite;
export declare function getNormalizedDomain(url: string | null | undefined): string | null;
export declare function isRealWebsite(url: string | null | undefined): boolean;
export declare function isOnlineProfile(url: string | null | undefined): boolean;
export declare function getWebsiteClassification(url: string | null | undefined): {
    websiteType: WebsiteClassificationType;
    hasRealWebsite: boolean;
    websiteClassification: 'business_website' | 'social_profile' | 'google_business_profile' | 'directory_listing' | 'no_website';
    websiteAuditAllowed: boolean;
    socialProfiles: SocialProfiles;
    socialPlatforms: string[];
    primaryPlatform?: string;
};
export declare function setLeadClassificationFields(leadDoc: Record<string, unknown>, website: string | null | undefined): void;
export declare const websiteClassificationService: {
    classifyWebsiteUrl: typeof classifyWebsiteUrl;
    isRealWebsite: typeof isRealWebsite;
    isOnlineProfile: typeof isOnlineProfile;
    getWebsiteClassification: typeof getWebsiteClassification;
    getNormalizedDomain: typeof getNormalizedDomain;
    setLeadClassificationFields: typeof setLeadClassificationFields;
};
//# sourceMappingURL=urlClassifier.service.d.ts.map