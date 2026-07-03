export declare class RedesignPotentialEngine {
    assess(input: {
        responsiveScore: number;
        uiuxScore: number;
        viewportMeta: boolean;
        mobileFriendly: boolean;
        horizontalScroll: boolean;
        copyrightYear: number | null;
        websiteFreshnessStatus: string;
        designGeneration: string;
        hasBrokenButtons: boolean;
        hasCroppedSections: boolean;
        hasNavigationIssues: boolean;
    }): 'low' | 'medium' | 'high';
}
export declare const redesignPotentialEngine: RedesignPotentialEngine;
//# sourceMappingURL=redesign-potential-engine.d.ts.map