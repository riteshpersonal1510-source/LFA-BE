export declare class CacheService {
    private store;
    private hitCount;
    private missCount;
    private maxSize;
    constructor(maxSize?: number);
    get<T>(key: string): T | null;
    set<T>(key: string, data: T, ttlMs: number): void;
    delete(key: string): void;
    clear(): void;
    get stats(): {
        size: number;
        hits: number;
        misses: number;
        hitRate: string;
    };
    private evictExpired;
}
export declare const cacheService: CacheService;
//# sourceMappingURL=cache.service.d.ts.map