import { LeadInput, GeneratedWhatsAppMessage } from './ai-outreach.types';
export declare class WhatsAppMessageEngine {
    generateShortPitch(lead: LeadInput): GeneratedWhatsAppMessage;
    generateMediumPitch(lead: LeadInput): GeneratedWhatsAppMessage;
    generateAggressivePitch(lead: LeadInput): GeneratedWhatsAppMessage;
    generateFriendlyOutreach(lead: LeadInput): GeneratedWhatsAppMessage;
    generateAll(lead: LeadInput, types: string[]): GeneratedWhatsAppMessage[];
    private getPrimaryIssue;
    private getTopIssues;
    private getStrengths;
}
export declare const whatsappMessageEngine: WhatsAppMessageEngine;
//# sourceMappingURL=whatsapp-message-engine.d.ts.map