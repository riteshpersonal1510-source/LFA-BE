export interface ConfidenceInput {
    relevanceScore: number;
    categoryConfidence: number;
    locationConfidence: number;
    sourceTrustScore: number;
    hasWebsite: boolean;
    hasPhone: boolean;
    hasEmail: boolean;
    ratingScore: number;
    negativeMatch: boolean;
    matchType: 'exact' | 'alias' | 'related' | 'fuzzy' | 'none';
}
export interface ConfidenceResult {
    finalConfidence: number;
    relevanceScore: number;
    categoryConfidence: number;
    locationConfidence: number;
    sourceTrustScore: number;
    contactCompleteness: number;
    breakdown: {
        relevanceWeight: number;
        categoryWeight: number;
        locationWeight: number;
        sourceWeight: number;
        contactWeight: number;
        ratingWeight: number;
    };
    level: 'high' | 'medium' | 'low';
}
export declare class ConfidenceEngine {
    calculate(input: ConfidenceInput, sourceName?: string): ConfidenceResult;
    private calculateContactCompleteness;
    getSourceTrustScore(sourceName: string): number;
}
export declare const confidenceEngine: ConfidenceEngine;
//# sourceMappingURL=confidence-engine.d.ts.map