import { LeadInput, OutreachScoreResult } from './ai-outreach.types';
export declare class OutreachScoreEngine {
    calculate(lead: LeadInput): OutreachScoreResult;
    private calculateReviewsScore;
    private calculateDigitalMaturity;
}
export declare const outreachScoreEngine: OutreachScoreEngine;
//# sourceMappingURL=outreach-score-engine.d.ts.map