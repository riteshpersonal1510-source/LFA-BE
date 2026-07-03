export declare class ConversionPredictor {
    predict(input: {
        responsiveScore: number;
        uiuxScore: number;
        trustScore: number;
        seoOpportunity: string;
        redesignPotential: string;
        websiteFreshnessStatus: string;
        socialPresenceScore: number;
    }): 'low' | 'medium' | 'high';
}
export declare const conversionPredictor: ConversionPredictor;
//# sourceMappingURL=conversion-predictor.d.ts.map