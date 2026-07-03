export type DetectedWebsiteType = 'STANDALONE' | 'PROFILE_ONLY' | 'UNKNOWN';
export type WebsitePresenceStatus = 'YES' | 'NO';
export interface WebsiteDetectionResult {
    hasWebsite: boolean;
    websiteStatus: WebsitePresenceStatus;
    websiteType: DetectedWebsiteType;
    hasRealWebsite: boolean;
}
export interface LeadWebsiteDetectionFields {
    hasWebsite: boolean;
    websiteStatus: WebsitePresenceStatus;
    detectedWebsiteType: DetectedWebsiteType;
    hasRealWebsite: boolean;
    websiteType: string;
    websiteClassification: string;
    websiteAuditAllowed: boolean;
}
export declare class WebsiteDetectionService {
    detect(url: string | null | undefined): WebsiteDetectionResult;
    getLeadFields(url: string | null | undefined): LeadWebsiteDetectionFields;
    resolveLeadHasWebsite(lead: {
        website?: string | null;
        hasWebsite?: boolean;
        hasRealWebsite?: boolean;
    }): boolean;
}
export declare const websiteDetectionService: WebsiteDetectionService;
//# sourceMappingURL=website-detection.service.d.ts.map