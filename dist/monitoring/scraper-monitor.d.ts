import { ScraperSession } from '../scraper-core/scraper-session';
export interface ScraperMetrics {
    activeSessions: number;
    totalScrapes: number;
    successfulScrapes: number;
    failedScrapes: number;
    averageScrapeTime: number;
    browserCrashes: number;
    retryCount: number;
    lastScrapeTime?: Date;
}
export declare class ScraperMonitor {
    private sessionCount;
    private scrapeCount;
    private successCount;
    private failureCount;
    private crashCount;
    private totalRetryCount;
    private scrapeTimes;
    private lastScrapeTime?;
    constructor();
    trackSessionStart(): void;
    trackSessionComplete(session: ScraperSession, success: boolean): void;
    trackBrowserCrash(): void;
    trackRetry(): void;
    getMetrics(): ScraperMetrics;
    getSuccessRate(): number;
    getFailureRate(): number;
    reset(): void;
}
export declare const scraperMonitor: ScraperMonitor;
//# sourceMappingURL=scraper-monitor.d.ts.map