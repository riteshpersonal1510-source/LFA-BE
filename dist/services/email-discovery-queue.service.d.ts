export declare class EmailDiscoveryQueue {
    private queue;
    private running;
    private maxConcurrent;
    constructor(maxConcurrent?: number);
    enqueue(leadId: string, callback: () => Promise<void>): void;
    private processNext;
    get pendingCount(): number;
    get runningCount(): number;
}
export declare const emailDiscoveryQueue: EmailDiscoveryQueue;
//# sourceMappingURL=email-discovery-queue.service.d.ts.map