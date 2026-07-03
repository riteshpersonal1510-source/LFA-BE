import { ScraperLead } from './types';
export interface StorageResult {
    totalStored: number;
    totalDuplicates: number;
    leads: ScraperLead[];
}
export interface StorageContext {
    keyword: string;
    location: string;
    area?: string;
    city?: string;
    state?: string;
    country?: string;
    businessType: string;
    fullSearchQuery?: string;
    semanticKeyword?: string;
    sessionId?: string;
    automationSessionId?: string;
    automationJobId?: string;
    dedupEnabled?: boolean;
    skipEnrichment?: boolean;
    onLeadSaved?: (saved: number, duplicates: number, rejected: number) => void | Promise<void>;
}
export type StorageContextRecord = StorageContext & Record<string, unknown>;
export declare class LeadStorage {
    private dedupCache;
    private dedupCacheMaxSize;
    private normalizerCache;
    private normalizerCacheMaxSize;
    clearSessionCache(): void;
    private checkDedupCache;
    private addToDedupCache;
    private getCachedNormalized;
    private setCachedNormalized;
    enrichLeads(leads: ScraperLead[], context: StorageContextRecord): Promise<number>;
    storeLeads(leads: ScraperLead[], context: StorageContextRecord): Promise<StorageResult>;
    private validateLead;
    private dedupKeyToCondition;
    private findDuplicate;
    private calculateLeadScore;
}
export declare const leadStorage: LeadStorage;
//# sourceMappingURL=lead-storage.d.ts.map