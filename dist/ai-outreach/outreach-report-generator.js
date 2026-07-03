"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.outreachReportGenerator = exports.OutreachReportGenerator = void 0;
const cold_email_engine_1 = require("./cold-email-engine");
const whatsapp_message_engine_1 = require("./whatsapp-message-engine");
const proposal_generator_1 = require("./proposal-generator");
const followup_sequence_engine_1 = require("./followup-sequence-engine");
const outreach_score_engine_1 = require("./outreach-score-engine");
const ai_pitch_generator_1 = require("./ai-pitch-generator");
class OutreachReportGenerator {
    constructor(engine, whatsappEngine, proposalGen, followupEngine, scoreEngine, pitchGenerator) {
        this.coldEmailEngine = engine || new cold_email_engine_1.ColdEmailEngine();
        this.whatsappEngine = whatsappEngine || new whatsapp_message_engine_1.WhatsAppMessageEngine();
        this.proposalGen = proposalGen || new proposal_generator_1.ProposalGenerator();
        this.followupEngine = followupEngine || new followup_sequence_engine_1.FollowupSequenceEngine();
        this.scoreEngine = scoreEngine || new outreach_score_engine_1.OutreachScoreEngine();
        this.pitchGenerator = pitchGenerator || new ai_pitch_generator_1.AIPitchGenerator();
    }
    generateFullReport(leadId, lead) {
        const emails = this.coldEmailEngine.generateAll(lead, []);
        const whatsappMessages = this.whatsappEngine.generateAll(lead, []);
        const proposals = this.proposalGen.generateAll(lead, []);
        const followupSequence = this.followupEngine.generateSequence(lead);
        const outreachScore = this.scoreEngine.calculate(lead);
        return {
            leadId,
            companyName: lead.companyName,
            emails,
            whatsappMessages,
            proposals,
            followupSequence,
            outreachScore,
            generatedAt: new Date().toISOString(),
        };
    }
    generatePitchSummary(lead) {
        return this.pitchGenerator.generateSalesPitch(lead);
    }
    generateQuickPitch(lead) {
        return this.pitchGenerator.generateQuickPitch(lead);
    }
}
exports.OutreachReportGenerator = OutreachReportGenerator;
exports.outreachReportGenerator = new OutreachReportGenerator();
//# sourceMappingURL=outreach-report-generator.js.map