export interface QualityScore {
    total: number;
    maxScore: number;
    breakdown: {
        phone: number;
        email: number;
        website: number;
        address: number;
        category: number;
        rating: number;
        reviews: number;
        social: number;
        completeness: number;
    };
    label: 'excellent' | 'good' | 'average' | 'poor';
}
export declare function calculateQualityScore(lead: {
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    address?: string | null;
    category?: string | null;
    rating?: number | null;
    reviewsCount?: number | null;
    websiteClassification?: string | null;
    socialPlatforms?: string[] | null;
    companyName?: string | null;
}): QualityScore;
export declare function calculateLeadTrustScore(lead: {
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    websiteClassification?: string | null;
    rating?: number | null;
    reviewsCount?: number | null;
    source?: string | null;
    finalConfidence?: number | null;
    verificationScore?: number | null;
}): number;
export declare function calculateDataQuality(lead: {
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    address?: string | null;
    category?: string | null;
    companyName?: string | null;
}): number;
export type LeadQuality = 'excellent' | 'good' | 'average' | 'poor';
//# sourceMappingURL=quality-engine.d.ts.map