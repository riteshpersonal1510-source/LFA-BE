import { LeadInput, GeneratedProposal } from './ai-outreach.types';
import { PersonalizationEngine } from './personalization-engine';
export declare class ProposalGenerator {
    protected personalization: PersonalizationEngine;
    constructor(personalization?: PersonalizationEngine);
    generateSEOProposal(lead: LeadInput): GeneratedProposal;
    generateWebsiteRedesignProposal(lead: LeadInput): GeneratedProposal;
    generateDigitalMarketingProposal(lead: LeadInput): GeneratedProposal;
    generatePerformanceProposal(lead: LeadInput): GeneratedProposal;
    generateAll(lead: LeadInput, types: string[]): GeneratedProposal[];
    protected buildProposalHTML(data: {
        lead: LeadInput;
        title: string;
        painPoints: string[];
        services: string[];
        improvements: string[];
        timeline: string;
        investment: string;
    }): string;
}
export declare const proposalGenerator: ProposalGenerator;
//# sourceMappingURL=proposal-generator.d.ts.map