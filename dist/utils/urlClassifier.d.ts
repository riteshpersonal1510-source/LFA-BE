import { WebsiteClassification } from './websiteClassifier';
export interface ClassifiedPlatform {
    platform: string;
    url: string;
    classification: WebsiteClassification;
    displayName: string;
}
export interface UrlClassificationResult {
    hasRealWebsite: boolean;
    websiteClassification: WebsiteClassification;
    websiteAuditAllowed: boolean;
    socialPlatforms: string[];
    primaryPlatform: string | undefined;
    platforms: ClassifiedPlatform[];
}
export declare function classifyLeadUrls(lead: {
    website?: string | null;
    sourceUrl?: string | null;
    socialLinks?: Record<string, string | string[] | undefined>;
    marketplaceLinks?: Record<string, string | string[] | undefined>;
    mapsLinks?: string[];
}): UrlClassificationResult;
//# sourceMappingURL=urlClassifier.d.ts.map