export interface BusinessTypeGroup {
    primary: string;
    aliases: string[];
    relatedTerms: string[];
    negativePatterns: string[];
    categoryKeywords: string[];
}
export declare class KeywordIntelligence {
    getGroup(businessType: string): BusinessTypeGroup | undefined;
    getAllGroups(): BusinessTypeGroup[];
    matchAgainstGroup(companyName: string, category: string | undefined, businessType: string): {
        matched: boolean;
        score: number;
        matchedTerms: string[];
        matchedCategory: string;
        negativeMatch: boolean;
    };
    private fuzzyMatch;
    private classifyToCategory;
    private fallbackMatch;
    getAllPrimaryTypes(): string[];
}
export declare const keywordIntelligence: KeywordIntelligence;
//# sourceMappingURL=keyword-intelligence.d.ts.map