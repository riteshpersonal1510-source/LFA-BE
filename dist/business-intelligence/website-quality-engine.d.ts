import { WebsiteQualityScore } from './types';
export declare class WebsiteQualityEngine {
    calculateQualityScore(seoScore: number, responsiveScore: number, uiuxScore: number, trustScore: number, performanceScore: number, socialPresenceScore: number): WebsiteQualityScore;
    private getDefaultQualityScore;
}
export declare const websiteQualityEngine: WebsiteQualityEngine;
//# sourceMappingURL=website-quality-engine.d.ts.map