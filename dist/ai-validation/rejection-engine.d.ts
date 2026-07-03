export interface RejectionResult {
    rejected: boolean;
    reason: string | undefined;
    rejectionCode: RejectionCode;
}
export type RejectionCode = 'IRRELEVANT_BUSINESS' | 'LOW_CONFIDENCE' | 'LOW_LOCATION_CONFIDENCE' | 'NEGATIVE_MATCH' | 'AMBIGUOUS_CATEGORY' | 'NO_CONTACT_INFO' | 'THRESHOLD_NOT_MET' | 'NOT_REJECTED';
export interface RejectionConfig {
    minRelevanceScore: number;
    minFinalConfidence: number;
    minLocationConfidence: number;
    rejectOnNegativeMatch: boolean;
    rejectWithoutContact: boolean;
}
export declare class RejectionEngine {
    private config;
    constructor(config?: Partial<RejectionConfig>);
    evaluate(params: {
        relevanceScore: number;
        finalConfidence: number;
        locationConfidence: number;
        categoryConfidence: number;
        negativeMatch: boolean;
        hasWebsite: boolean;
        hasPhone: boolean;
        hasEmail: boolean;
        ambiguityWarnings?: string[];
    }): RejectionResult;
    updateConfig(config: Partial<RejectionConfig>): void;
    getConfig(): RejectionConfig;
}
export declare const rejectionEngine: RejectionEngine;
//# sourceMappingURL=rejection-engine.d.ts.map