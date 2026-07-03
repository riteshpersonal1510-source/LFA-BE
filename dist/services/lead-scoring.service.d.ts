export interface LeadScoreResult {
    score: number;
    priority: 'high' | 'medium' | 'low';
    reasoning: string[];
    breakdown: {
        websitePresence: number;
        contactInfo: number;
        responsiveScore: number;
        seoScore: number;
        socialPresence: number;
        businessStrength: number;
        websiteQuality: number;
    };
}
export interface LeadData {
    hasWebsite?: boolean;
    websiteReachable?: boolean;
    email?: string;
    phone?: string;
    rating?: number;
    reviewsCount?: number;
    businessStatus?: string;
    responsiveScore?: number;
    seoScore?: number;
    websiteQualityScore?: number;
    socialLinks?: Record<string, unknown>;
    websiteQuality?: {
        score?: number;
        issues?: string[];
    };
}
export declare class LeadScoringService {
    calculate(data: LeadData): LeadScoreResult;
}
export declare const leadScoringService: LeadScoringService;
//# sourceMappingURL=lead-scoring.service.d.ts.map