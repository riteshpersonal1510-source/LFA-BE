export interface WebsiteCacheData {
    emails: string[];
    phones: string[];
    socialLinks: Record<string, string>;
    companyName?: string;
    copyright?: string;
    hasContactForm: boolean;
    hasContactPage: boolean;
    pagesCrawled: string[];
    extractedAt: string;
}
export declare class WebsiteCache {
    private cache;
    private maxEntries;
    private defaultTtl;
    get(domain: string): WebsiteCacheData | null;
    set(domain: string, data: WebsiteCacheData, ttl?: number): void;
    has(domain: string): boolean;
    invalidate(domain: string): void;
    clear(): void;
    get size(): number;
    get stats(): {
        size: number;
        maxEntries: number;
        defaultTtl: number;
    };
    private normalizeDomain;
}
export declare const websiteCache: WebsiteCache;
//# sourceMappingURL=website-cache.service.d.ts.map