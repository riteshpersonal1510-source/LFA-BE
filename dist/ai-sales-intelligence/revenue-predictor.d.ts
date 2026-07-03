export declare class RevenuePredictor {
    predict(input: {
        rating: number;
        reviewsCount: number;
        websiteQualityScore: number;
        socialPresenceScore: number;
        category: string | null;
        area: string | null;
        leadScore: number;
    }): 'low' | 'medium' | 'high' | 'enterprise';
}
export declare const revenuePredictor: RevenuePredictor;
//# sourceMappingURL=revenue-predictor.d.ts.map