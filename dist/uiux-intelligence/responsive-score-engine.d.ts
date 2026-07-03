import { ResponsiveAudit, UIUXAuditResult, ResponsiveScore, LayoutMetrics } from './types';
export declare class ResponsiveScoreEngine {
    calculateScores(responsiveAudit: ResponsiveAudit, uiuxAudit: UIUXAuditResult, _desktopMetrics: LayoutMetrics, mobileMetrics: LayoutMetrics): ResponsiveScore;
    private calculateResponsiveScore;
    private calculateUIUXScore;
    private calculateMobileExperienceScore;
    getScoreLevel(score: number): 'good' | 'medium' | 'poor';
    getScoreColor(score: number): string;
    getScoreRecommendation(score: number, type: 'responsive' | 'uiux' | 'mobile'): string;
}
export declare const responsiveScoreEngine: ResponsiveScoreEngine;
//# sourceMappingURL=responsive-score-engine.d.ts.map