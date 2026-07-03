export interface RetryConfig {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
    backoffFactor: number;
}
export declare const DEFAULT_RETRY_CONFIG: RetryConfig;
export declare function classifyError(error: unknown): {
    isTransient: boolean;
    category: 'transient' | 'permanent' | 'unknown';
    normalizedMessage: string;
};
export declare function calculateDelay(attempt: number, config?: RetryConfig): number;
export declare function executeWithRetry<T>(fn: () => Promise<T>, context: {
    operation: string;
    leadId?: string;
    sessionId?: string;
    source?: string;
}, config?: RetryConfig): Promise<{
    success: boolean;
    data: T | null;
    error: string | null;
    retriesUsed: number;
    permanent: boolean;
}>;
//# sourceMappingURL=retry-policy.d.ts.map