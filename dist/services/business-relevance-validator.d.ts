export interface RelevanceResult {
    relevant: boolean;
    score: number;
    matchedKeywords: string[];
    validatedCategory: string;
}
export interface AIValidationResult {
    relevant: boolean;
    relevanceScore: number;
    categoryConfidence: number;
    locationConfidence: number;
    finalConfidence: number;
    validationStatus: 'validated' | 'rejected' | 'needs-review';
    rejectionReason: string | undefined;
    quality: 'excellent' | 'good' | 'average' | 'poor';
    matchedKeywords: string[];
    validatedCategory: string;
    matchType: string;
    warnings: string[];
}
export declare class BusinessRelevanceValidator {
    validate(companyName: string, category: string | undefined, businessType: string): RelevanceResult;
    validateLocation(address: string | undefined, targetArea?: string, targetCity?: string, targetState?: string): {
        relevant: boolean;
        score: number;
    };
    validateWithAI(companyName: string, category: string | undefined, businessType: string, address?: string, website?: string, phone?: string, email?: string, rating?: number, source?: string, targetArea?: string, targetCity?: string, targetState?: string): AIValidationResult;
}
export declare const businessRelevanceValidator: BusinessRelevanceValidator;
//# sourceMappingURL=business-relevance-validator.d.ts.map