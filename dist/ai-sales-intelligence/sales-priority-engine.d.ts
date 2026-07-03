export declare class SalesPriorityEngine {
    assess(input: {
        aiLeadScore: number;
        conversionProbability: string;
        websiteRedesignPotential: string;
        seoOpportunity: string;
        revenuePotential: string;
        trustScore: number;
        rating: number;
        reviewsCount: number;
    }): 'low' | 'medium' | 'high' | 'urgent';
}
export declare const salesPriorityEngine: SalesPriorityEngine;
//# sourceMappingURL=sales-priority-engine.d.ts.map