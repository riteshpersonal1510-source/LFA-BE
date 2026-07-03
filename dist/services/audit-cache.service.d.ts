export declare class AuditCacheService {
    private static instance;
    private cache;
    private readonly DEFAULT_TTL_MS;
    private cleanupTimer;
    private constructor();
    static getInstance(): AuditCacheService;
    hashWebsite(website: string): string;
    get<T>(key: string): T | null;
    set<T>(key: string, data: T, website?: string): void;
    getByWebsiteHash<T>(key: string, website: string): {
        data: T | null;
        isCached: boolean;
    };
    invalidate(key: string): void;
    clear(): void;
    private startCleanup;
    stopCleanup(): void;
    size(): number;
}
export declare const auditCache: AuditCacheService;
//# sourceMappingURL=audit-cache.service.d.ts.map