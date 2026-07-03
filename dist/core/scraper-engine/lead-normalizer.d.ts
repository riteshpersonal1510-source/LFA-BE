import { ScraperLead } from './types';
export declare class LeadNormalizer {
    normalize(lead: ScraperLead, context: {
        keyword: string;
        location: string;
        state?: string;
        city?: string;
        area?: string;
        businessType: string;
        source: string;
    }): ScraperLead;
    normalizeName(name: string): string;
    normalizePhone(phone?: string): string | undefined;
    normalizeWebsite(website?: string): string | undefined;
    normalizeAddress(address?: string): string | undefined;
    getDedupKey(lead: ScraperLead): string[];
}
export declare const leadNormalizer: LeadNormalizer;
//# sourceMappingURL=lead-normalizer.d.ts.map