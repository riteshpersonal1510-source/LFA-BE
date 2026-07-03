import { NormalizedLead } from './normalization.service';
export declare class DeduplicationService {
    private normalizeCompanyName;
    private getDedupKey;
    findDuplicates(leads: Array<Partial<NormalizedLead>>, existingKeys: Set<string>): {
        unique: Array<Partial<NormalizedLead>>;
        duplicates: number;
    };
    mergeExistingLeads(newLeads: Array<Partial<NormalizedLead>>, existingLeads: Array<{
        companyName?: string;
        phone?: string;
        website?: string;
        address?: string;
        sources?: string[];
    }>): {
        merged: Array<Partial<NormalizedLead>>;
        duplicates: number;
    };
}
export declare const deduplicationService: DeduplicationService;
//# sourceMappingURL=deduplication.service.d.ts.map