export interface WebsiteAnalysisResult {
    hasWebsite: boolean;
    websiteUrl: string | null;
    normalizedDomain: string | null;
    websiteType: 'BUSINESS_WEBSITE' | 'ONLINE_PROFILE' | 'NO_WEBSITE';
    analysisEligible: boolean;
}
export declare class WebsiteAnalysisService {
    analyze(websiteUrl: string | null | undefined): WebsiteAnalysisResult;
    getLeadFields(websiteUrl: string | null | undefined): {
        website: string | null;
        hasWebsite: boolean;
        normalizedDomain: string | null;
        websiteType: string;
        analysisEligible: boolean;
        hasRealWebsite: boolean;
        websiteAuditAllowed: boolean;
    };
    resolveLead(lead: {
        website?: string | null;
    }): WebsiteAnalysisResult;
}
export declare const websiteAnalysisService: WebsiteAnalysisService;
//# sourceMappingURL=website-analysis.service.d.ts.map