export interface DuplicateScore {
    isDuplicate: boolean;
    confidence: number;
    matchedOn: string[];
    existingLeadId?: string;
}
export interface MergeResult {
    merged: boolean;
    source: Record<string, unknown>;
    target: Record<string, unknown>;
    mergedFields: string[];
}
export declare function jaccardSimilarity(a: string[], b: string[]): number;
export declare function nameSimilarity(name1: string, name2: string): number;
export declare function detectDuplicate(lead: {
    companyName?: string | null;
    phone?: string | null;
    website?: string | null;
    address?: string | null;
}, existing: {
    companyName?: string | null;
    phone?: string | null;
    website?: string | null;
    address?: string | null;
}): DuplicateScore;
export declare function mergeLeads<T extends Record<string, unknown>>(incoming: T, existing: T, priorityFields?: string[]): MergeResult;
export declare function duplicateConfidenceLabel(score: number): string;
//# sourceMappingURL=dedup-engine.d.ts.map