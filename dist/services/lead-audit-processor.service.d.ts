export declare class LeadAuditProcessor {
    private readonly maxConcurrent;
    private readonly limit;
    private queue;
    private processing;
    private totalEnqueued;
    private totalCompleted;
    private results;
    enqueueLead(leadId: string, website: string): void;
    enqueueMany(leadIds: Array<{
        leadId: string;
        website: string;
    }>): void;
    private processQueue;
    private processSingleLead;
    getQueueStats(): {
        enqueued: number;
        completed: number;
        pending: number;
        processing: boolean;
    };
}
export declare const leadAuditProcessor: LeadAuditProcessor;
//# sourceMappingURL=lead-audit-processor.service.d.ts.map