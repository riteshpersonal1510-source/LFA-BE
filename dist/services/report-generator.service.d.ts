export interface ReportResult {
    businessSummary: {
        companyName: string;
        category: string;
        location: string;
        rating: number;
        reviewsCount: number;
        businessStatus: string;
    };
    websiteStatus: {
        exists: boolean;
        reachable: boolean;
        url: string;
        cms: string;
        https: boolean;
    };
    responsiveAudit: Record<string, unknown>;
    seoSummary: {
        score: number;
        issues: string[];
        title: string;
        description: string;
    };
    performanceSummary: {
        score: number;
        loadTimeMs: number;
        issues: string[];
    };
    missingFeatures: string[];
    improvementRecommendations: string[];
    leadScore: number;
    priority: 'high' | 'medium' | 'low';
    recommendedServices: string[];
    websiteOpportunity: {
        level: string;
        explanation: string;
    };
    generatedAt: string;
}
export interface ReportData {
    companyName?: string;
    category?: string;
    city?: string;
    state?: string;
    rating?: number;
    reviewsCount?: number;
    businessStatus?: string;
    website?: string;
    websiteReachable?: boolean;
    websiteMetadata?: {
        cms?: string;
        httpsEnabled?: boolean;
    };
    responsiveAudit?: Record<string, unknown>;
    responsiveScore?: number;
    seoAudit?: {
        score?: number;
        issues?: string[];
        title?: string;
        description?: string;
    };
    performanceAudit?: {
        score?: number;
        loadTimeMs?: number;
        issues?: string[];
    };
    websiteQuality?: {
        issues?: string[];
    };
    leadScore?: number;
    priority?: string;
    websiteOpportunity?: {
        opportunity?: string;
        explanation?: string;
        recommendedServices?: string[];
    };
}
export declare class ReportGeneratorService {
    generate(data: ReportData): ReportResult;
}
export declare const reportGeneratorService: ReportGeneratorService;
//# sourceMappingURL=report-generator.service.d.ts.map