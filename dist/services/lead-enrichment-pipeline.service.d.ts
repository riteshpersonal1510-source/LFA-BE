export declare class LeadEnrichmentPipeline {
    private activeEnrichments;
    private maxConcurrent;
    enqueueLead(leadId: string, force?: boolean): Promise<void>;
    enqueueMultiple(leadIds: string[], force?: boolean): void;
    private runPipeline;
    getStatus(): {
        activeCount: number;
        maxConcurrent: number;
    };
    private computeWebsiteHash;
}
export declare const leadEnrichmentPipeline: LeadEnrichmentPipeline;
//# sourceMappingURL=lead-enrichment-pipeline.service.d.ts.map