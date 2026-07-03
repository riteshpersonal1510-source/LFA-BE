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
export declare class MetricsService {
    constructor();
    getStatus(): Promise<ScraperMetrics>;
    getMetrics(): Promise<ScraperMetrics>;
    getSuccessRate(): Promise<number>;
    getFailureRate(): Promise<number>;
    getDetailedMetrics(): Promise<{
        summary: ScraperMetrics;
        successRate: number;
        failureRate: number;
        scrapeTimeDistribution: {
            fast: number;
            medium: number;
            slow: number;
        };
    }>;
    reset(): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<void>;
}
export declare const metricsService: MetricsService;
//# sourceMappingURL=metrics.service.d.ts.map