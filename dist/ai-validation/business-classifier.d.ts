export interface ClassificationResult {
    detectedCategory: string;
    detectedGroup: string | null;
    confidence: number;
    allPossibleCategories: Array<{
        category: string;
        confidence: number;
    }>;
    isHomophone: boolean;
    ambiguityWarnings: string[];
}
export declare class BusinessClassifier {
    classify(companyName: string, category: string | undefined, preferredBusinessType?: string): ClassificationResult;
}
export declare const businessClassifier: BusinessClassifier;
//# sourceMappingURL=business-classifier.d.ts.map