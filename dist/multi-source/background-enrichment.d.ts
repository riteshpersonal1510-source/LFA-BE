interface EnrichmentTask {
    leadId: string;
    source: string;
    keyword: string;
}
export declare class BackgroundEnrichmentWorker {
    private queue;
    private processing;
    private running;
    private activeCount;
    start(): void;
    stop(): void;
    enqueue(task: EnrichmentTask): void;
    enqueueBatch(tasks: EnrichmentTask[]): void;
    getQueueSize(): number;
    getProcessingCount(): number;
    private processLoop;
    private processTask;
    private sleep;
}
export {};
//# sourceMappingURL=background-enrichment.d.ts.map