import { LeadInput, GeneratedEmail } from './ai-outreach.types';
export declare class ColdEmailEngine {
    generateWebsiteRedesignEmail(lead: LeadInput): GeneratedEmail;
    generateSEOEmail(lead: LeadInput): GeneratedEmail;
    generateDigitalMarketingEmail(lead: LeadInput): GeneratedEmail;
    generatePerformanceEmail(lead: LeadInput): GeneratedEmail;
    generateAll(lead: LeadInput, types: string[]): GeneratedEmail[];
    private getWebsiteIssues;
    private getSEOIssues;
    private getMarketingIssues;
    private getPerformanceIssues;
    private getStrengths;
}
export declare const coldEmailEngine: ColdEmailEngine;
//# sourceMappingURL=cold-email-engine.d.ts.map