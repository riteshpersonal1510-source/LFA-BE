export interface SchedulerQuery<T = unknown> {
    id: string;
    execute: () => Promise<T>;
    timeoutMs: number;
    maxRetries: number;
    retryCount: number;
    label: string;
}
export interface SchedulerResult<T = unknown> {
    id: string;
    label: string;
    success: boolean;
    data: T | null;
    error: string | null;
    durationMs: number;
    retriesUsed: number;
    timedOut: boolean;
}
export declare class SearchQueryScheduler {
    private concurrencyLimit;
    private activeCount;
    private queue;
    constructor(concurrencyLimit?: number);
    setConcurrency(limit: number): void;
    submit<T>(query: SchedulerQuery<T>): Promise<SchedulerResult<T>>;
    submitBatch<T>(queries: SchedulerQuery<T>[]): Promise<SchedulerResult<T>[]>;
    private processNext;
    private executeWithRetry;
    private isRetryableError;
    private delay;
    getActiveCount(): number;
    getQueueLength(): number;
    getStatus(): {
        activeCount: number;
        queueLength: number;
        concurrencyLimit: number;
    };
    clear(): void;
}
export declare const searchQueryScheduler: SearchQueryScheduler;
//# sourceMappingURL=search-query-scheduler.service.d.ts.map