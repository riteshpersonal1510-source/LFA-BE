import { BusinessOpportunity, OpportunityFactors, TrustScore, WebsiteFreshness } from './types';
export declare class OpportunityEngine {
    detectOpportunity(factors: OpportunityFactors, _trustScore: TrustScore, websiteFreshness: WebsiteFreshness, _websiteQualityScore: number): BusinessOpportunity;
    private generateRecommendation;
    private getDefaultOpportunity;
}
export declare const opportunityEngine: OpportunityEngine;
//# sourceMappingURL=opportunity-engine.d.ts.map