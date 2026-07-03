import { RetryConfig } from './types';
export declare class RetryEngine {
    private config;
    constructor(config?: Partial<RetryConfig>);
    execute<T>(fn: () => Promise<T>, context: {
        source: string;
        keyword: string;
        attempt?: number;
    }): Promise<{
        success: boolean;
        data: T | null;
        error: string | null;
        retriesUsed: number;
    }>;
    shouldRetry(error: string): boolean;
    private calculateDelay;
    private sleep;
}
export declare const DEFAULT_RETRY_CONFIG_OBJ: RetryConfig;
//# sourceMappingURL=retry-engine.d.ts.map