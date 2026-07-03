export declare class MemoryCache {
    private defaultTTLMs;
    private store;
    private cleanupTimer;
    constructor(defaultTTLMs?: number);
    get<T>(key: string): T | undefined;
    set<T>(key: string, value: T, ttlMs?: number): void;
    has(key: string): boolean;
    delete(key: string): void;
    deleteByPrefix(prefix: string): void;
    clear(): void;
    get size(): number;
    getStats(): {
        size: number;
        entries: Array<{
            key: string;
            hits: number;
            ttlRemainingMs: number;
        }>;
    };
    private evictExpired;
    shutdown(): void;
}
export declare const queryCache: MemoryCache;
export declare const locationCache: MemoryCache;
//# sourceMappingURL=memory-cache.d.ts.map