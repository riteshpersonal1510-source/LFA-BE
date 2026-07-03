import { ScraperResult, ScraperOptions } from './types';
export declare class ScraperEngine {
    private googleMapsScraper;
    private justDialScraper;
    private indiaMartScraper;
    private retryEngine;
    private allLeads;
    private allErrors;
    constructor();
    scrapeMultiSource(options: ScraperOptions): Promise<ScraperResult>;
    private executeSourceScrape;
    private executeWithConcurrencyLimit;
    private executeTask;
    private buildResultMessage;
    getBrowserStatus(): {
        browserAlive: boolean;
        contexts: number;
        activePages: number;
        totalPagesCreated: number;
        totalPagesClosed: number;
        browserCrashes: number;
        memoryUsageMB: number;
    };
}
export declare const scraperEngine: ScraperEngine;
//# sourceMappingURL=scraper-engine.d.ts.map