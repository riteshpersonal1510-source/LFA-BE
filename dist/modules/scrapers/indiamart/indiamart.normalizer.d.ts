import type { IndiaMartEnrichedLead } from './indiamart.types';
import type { ScraperLead } from '../../../core/scraper-engine/types';
export declare function normalizePhone(raw: string): string;
export declare function normalizeWebsite(url: string): string | undefined;
export declare function normalizeAddress(raw: string): string;
export declare function extractLocationParts(address: string): {
    city?: string;
    state?: string;
    pincode?: string;
};
export declare function enrichToScraperLead(enriched: IndiaMartEnrichedLead, context: {
    keyword: string;
    location: string;
    area?: string;
    city?: string;
    state?: string;
    businessType: string;
}): ScraperLead;
export declare function computeLeadScore(lead: ScraperLead): number;
//# sourceMappingURL=indiamart.normalizer.d.ts.map