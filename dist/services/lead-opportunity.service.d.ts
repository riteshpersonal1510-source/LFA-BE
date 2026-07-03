export interface OpportunityResult {
    websiteExists: boolean;
    websiteMissing: boolean;
    websiteOutdated: boolean;
    noMobileOptimization: boolean;
    missingContactInfo: boolean;
    missingSeo: boolean;
    missingSocialPresence: boolean;
    noSsl: boolean;
    opportunity: 'high' | 'medium' | 'low';
    explanation: string;
    recommendedServices: string[];
}
export interface OpportunityData {
    hasWebsite?: boolean;
    websiteReachable?: boolean;
    websiteMetadata?: {
        httpsEnabled?: boolean;
        cms?: string;
    };
    seoAudit?: {
        score?: number;
    };
    responsiveScore?: number;
    phones?: string[];
    email?: string;
    socialLinks?: Record<string, unknown>;
    websiteQuality?: {
        sslEnabled?: boolean;
        score?: number;
        issues?: string[];
    };
}
export declare class LeadOpportunityService {
    analyze(data: OpportunityData): OpportunityResult;
}
export declare const leadOpportunityService: LeadOpportunityService;
//# sourceMappingURL=lead-opportunity.service.d.ts.map