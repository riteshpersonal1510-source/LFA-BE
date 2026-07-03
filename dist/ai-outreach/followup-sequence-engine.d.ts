import { LeadInput, FollowUpEntry } from './ai-outreach.types';
export declare class FollowupSequenceEngine {
    generateSequence(lead: LeadInput): FollowUpEntry[];
    private generateFollowUp1;
    private generateFollowUp2;
    private generateFollowUp3;
    private getPrimaryIssue;
    private getValueProposition;
}
export declare const followupSequenceEngine: FollowupSequenceEngine;
//# sourceMappingURL=followup-sequence-engine.d.ts.map