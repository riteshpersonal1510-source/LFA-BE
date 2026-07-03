import type { LeadData } from '../source-core/base-source';
export interface MergedLead extends LeadData {
    mergedSources: string[];
    mergedAt: string;
}
export declare class MergeEngine {
    private readonly KEY_SIMILARITY_THRESHOLD;
    merge(leads: LeadData[]): MergedLead[];
    private cluster;
    private keysMatch;
    private stringSimilarity;
    private levenshteinDistance;
    private mergeGroup;
    private calculateScore;
}
//# sourceMappingURL=merge-engine.d.ts.map