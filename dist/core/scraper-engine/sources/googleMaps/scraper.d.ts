import type { ScraperResult, ScraperOptions } from '../../types';
interface ProfilingSnapshot {
    phase: string;
    elapsed: number;
    cardsCollected: number;
    leadsSaved: number;
    workersActive: number;
    queueDepth: number;
}
export declare class GoogleMapsScraper {
    private navigationEngine;
    getProfile(): ProfilingSnapshot[];
    private lastProfile;
    scrape(options: ScraperOptions & {
        semanticKeyword?: string;
    }): Promise<ScraperResult>;
    private collectCards;
    private getScrollPercent;
    private smartScroll;
    private waitForFeedChange;
    private isCancelled;
    private lastActiveOptions;
    private runDetailWorkers;
    private detailWorker;
    private makeContext;
    private captureScreenshot;
    private blockedResult;
    private warmupPage;
    private detectBlocking;
    private captureDebugEvidence;
    private capturePageDiagnostics;
    private waitForBusinessDetailReady;
    private getFeedMetrics;
    private extractCards;
    private parseAddress;
    private extractWebsite;
    private extractPhone;
    private extractAddress;
    private extractPincode;
    private extractBusinessStatus;
    private extractOpeningHours;
    private extractPlusCode;
    private extractLatitude;
    private extractLongitude;
    private extractSecondaryCategories;
    private extractTotalPhotos;
    private extractServiceOptions;
    private extractOwnerClaimed;
    private extractAddressComponents;
    private extractEmailsFromWebsite;
    private normalizeWebsite;
    private normalizePhone;
}
export {};
//# sourceMappingURL=scraper.d.ts.map