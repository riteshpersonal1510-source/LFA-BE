import { LeadInput } from './ai-outreach.types';
export declare class AIPitchGenerator {
    generateSalesPitch(lead: LeadInput): string;
    generateQuickPitch(lead: LeadInput): string;
    private getStrengths;
    private getWeaknesses;
    private getMaturityLabel;
    private getTopIssue;
    private getServiceFocus;
    private getRecommendedApproach;
    private getExpectedOutcome;
}
export declare const aiPitchGenerator: AIPitchGenerator;
//# sourceMappingURL=ai-pitch-generator.d.ts.map