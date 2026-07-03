export interface CrawlAnalytics {
    totalCrawled: number;
    validLeads: number;
    duplicates: number;
    failedParses: number;
    verifiedPhones: number;
    verifiedEmails: number;
    websiteLeads: number;
    socialOnlyLeads: number;
    mapsOnlyLeads: number;
    averageCrawlSpeed: number;
    successRatio: number;
}
export declare function getSourceConfidence(source: string): number;
export declare function getSourceReliability(source: string): 'high' | 'medium' | 'low';
export declare function getSourceColor(source: string): string;
export declare function getSourceLabel(source: string): string;
export declare class CrawlingAnalyticsTracker {
    private metrics;
    private startTime;
    private lastLogTime;
    constructor();
    private resetMetrics;
    increment(metric: keyof CrawlAnalytics, count?: number): void;
    getMetrics(): CrawlAnalytics;
    logProgress(): void;
    logFinal(): void;
}
//# sourceMappingURL=analytics-engine.d.ts.map