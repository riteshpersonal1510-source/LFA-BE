import type { LeadData } from '../source-core/base-source';
export interface DedupResult {
    duplicate: boolean;
    matchedField: string;
    matchType: 'exact' | 'fuzzy' | 'phone' | 'website' | 'coordinate' | 'name' | 'address';
    confidence: number;
    matchedWith?: string;
}
export interface DedupReport {
    totalProcessed: number;
    duplicatesFound: number;
    uniqueLeads: number;
    fuzzyMatches: number;
    exactMatches: number;
}
export declare class DedupEngine {
    private readonly SIMILARITY_THRESHOLD;
    normalizeCompanyName(name: string): string;
    levenshteinDistance(a: string, b: string): number;
    similarity(a: string, b: string): number;
    normalizePhone(phone: string): string;
    normalizeAddress(address: string): string;
    isDuplicate(newLead: LeadData, existingLeads: LeadData[]): DedupResult;
    private compareByName;
    private compareByPhone;
    private compareByWebsite;
    private compareByAddress;
    deduplicate(leads: LeadData[]): {
        unique: LeadData[];
        duplicates: LeadData[];
        report: DedupReport;
    };
}
export declare const dedupEngine: DedupEngine;
//# sourceMappingURL=dedup-engine.d.ts.map