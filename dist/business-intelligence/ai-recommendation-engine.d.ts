import { AIRecommendation, BusinessOpportunity, OpportunityFactors, WebsiteQualityScore } from './types';
export declare class AIRecommendationEngine {
    generateRecommendation(opportunity: BusinessOpportunity, factors: OpportunityFactors, qualityScore: WebsiteQualityScore): AIRecommendation;
    private generateSummary;
    private estimateImpact;
    private getDefaultRecommendation;
}
export declare const aiRecommendationEngine: AIRecommendationEngine;
//# sourceMappingURL=ai-recommendation-engine.d.ts.map