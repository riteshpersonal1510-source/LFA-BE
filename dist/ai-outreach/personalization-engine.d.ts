import { LeadInput } from './ai-outreach.types';
export declare class PersonalizationEngine {
    personalizeContent(lead: LeadInput, template: string): string;
    getPrimaryPainPoints(lead: LeadInput): string[];
    getRecommendedServices(lead: LeadInput): string[];
    getDigitalMaturity(lead: LeadInput): 'basic' | 'developing' | 'advanced';
}
export declare const personalizationEngine: PersonalizationEngine;
//# sourceMappingURL=personalization-engine.d.ts.map