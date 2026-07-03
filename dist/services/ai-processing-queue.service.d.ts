export declare class AIProcessingQueue {
    private activeCount;
    private queue;
    private processing;
    private processingSet;
    private initialEnqueueDone;
    enqueueLead(leadId: string): Promise<void>;
    enqueueMultiple(leadIds: string[]): void;
    enqueueAllPendingLeads(limit?: number): Promise<number>;
    enqueuePendingOnStartup(): Promise<void>;
    getStatus(): {
        activeCount: number;
        queueLength: number;
        maxConcurrent: number;
    };
    private processNext;
    private executePipeline;
    private computeWebsiteHash;
}
export declare const aiProcessingQueue: AIProcessingQueue;
//# sourceMappingURL=ai-processing-queue.service.d.ts.map