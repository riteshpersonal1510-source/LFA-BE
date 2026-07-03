export interface RetryConfig {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    exponential: boolean;
}
export declare class RetryHandler {
    private config;
    private retryCount;
    constructor(maxRetries?: number);
    withRetry<T>(fn: () => Promise<T>, config?: Partial<RetryConfig>): Promise<T>;
    private calculateDelay;
    private shouldRetry;
    private sleep;
    getRetryCount(): number;
    getQueueLength(): number;
    reset(): void;
}
//# sourceMappingURL=retry-handler.d.ts.map