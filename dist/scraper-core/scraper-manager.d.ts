import { ScrapeOptions, ScrapeResult } from '../types/scraper.types';
export interface ScraperManagerOptions {
    maxConcurrentScrapes: number;
    maxRetries: number;
    timeout: number;
    headless: boolean;
}
export declare class ScraperManager {
    private browserPool;
    private retryHandler;
    private timeoutHandler;
    private worker;
    private options;
    constructor(options?: Partial<ScraperManagerOptions>);
    start(): Promise<void>;
    stop(): Promise<void>;
    scrape(options: ScrapeOptions): Promise<ScrapeResult>;
    getStatus(): {
        activeSessions: number;
        browserCount: number;
        queueLength: number;
        uptime: number;
    };
    getMetrics(): {
        totalScrapes: number;
        successfulScrapes: number;
        failedScrapes: number;
        averageScrapeTime: number;
    };
    restart(): Promise<void>;
}
export declare const scraperManager: ScraperManager;
//# sourceMappingURL=scraper-manager.d.ts.map