export interface SemanticValidationResult {
    relevant: boolean;
    score: number;
    categoryConfidence: number;
    matchedKeywords: string[];
    validatedCategory: string;
    matchType: 'exact' | 'alias' | 'related' | 'fuzzy' | 'none';
    negativeMatch: boolean;
    matchedGroup: string | null;
}
export declare class SemanticValidator {
    validate(companyName: string, category: string | undefined, businessType: string): SemanticValidationResult;
    private calculateCategoryConfidence;
    private fallback;
}
export declare const semanticValidator: SemanticValidator;
//# sourceMappingURL=semantic-validator.d.ts.map