export declare const DEFAULT_SEARCH_SOURCES: readonly ["google-maps", "justdial", "indiamart", "clutch", "website"];
export interface ScrapeOptions {
    keyword: string;
    location?: string;
    sources?: string[];
    limit: number;
    state?: string;
    city?: string;
    area?: string;
    country?: string;
    businessType?: string;
    sessionId?: string;
    skipSearchTracking?: boolean;
    isCancelled?: () => boolean;
    semanticExpansion?: boolean;
    maxResults?: number;
    resumeSessionId?: string;
}
export interface ScrapeResult {
    success: boolean;
    message: string;
    results: {
        [sourceName: string]: {
            totalExtracted: number;
            totalStored: number;
            totalDuplicates: number;
        };
    };
    totalExtracted: number;
    totalStored: number;
    totalDuplicates: number;
    leads: unknown[];
    errors?: Array<{
        source: string;
        keyword: string;
        error: string;
    }>;
}
export declare class ScraperService {
    scrapeBusinesses(options: ScrapeOptions): Promise<ScrapeResult>;
    private _cancelled;
}
export declare const scraperService: ScraperService;
//# sourceMappingURL=scraper.service.d.ts.map