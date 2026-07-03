export declare class AuditConcurrencyService {
    private static instance;
    private readonly MAX_CONCURRENT;
    private activeCount;
    private queue;
    private processing;
    static getInstance(): AuditConcurrencyService;
    enqueue<T>(id: string, type: string, execute: () => Promise<T>): Promise<T>;
    private processNext;
    private executeTask;
    getStatus(): {
        activeCount: number;
        queueLength: number;
        maxConcurrent: number;
    };
}
export declare const auditConcurrency: AuditConcurrencyService;
//# sourceMappingURL=audit-concurrency.service.d.ts.map