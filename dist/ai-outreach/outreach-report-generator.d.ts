import { LeadInput, OutreachReport } from './ai-outreach.types';
import { ColdEmailEngine } from './cold-email-engine';
import { WhatsAppMessageEngine } from './whatsapp-message-engine';
import { ProposalGenerator } from './proposal-generator';
import { FollowupSequenceEngine } from './followup-sequence-engine';
import { OutreachScoreEngine } from './outreach-score-engine';
import { AIPitchGenerator } from './ai-pitch-generator';
export declare class OutreachReportGenerator {
    private coldEmailEngine;
    private whatsappEngine;
    private proposalGen;
    private followupEngine;
    private scoreEngine;
    private pitchGenerator;
    constructor(engine?: ColdEmailEngine, whatsappEngine?: WhatsAppMessageEngine, proposalGen?: ProposalGenerator, followupEngine?: FollowupSequenceEngine, scoreEngine?: OutreachScoreEngine, pitchGenerator?: AIPitchGenerator);
    generateFullReport(leadId: string, lead: LeadInput): OutreachReport;
    generatePitchSummary(lead: LeadInput): string;
    generateQuickPitch(lead: LeadInput): string;
}
export declare const outreachReportGenerator: OutreachReportGenerator;
//# sourceMappingURL=outreach-report-generator.d.ts.map