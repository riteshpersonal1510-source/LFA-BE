export interface ScrollMetrics {
    totalScrolls: number;
    emptyScrolls: number;
    maxEmptyScrolls: number;
    cardCounts: number[];
    stabilized: boolean;
}
export interface CrawlResult {
    googleDisplayedCount: number;
    actualDetectedCards: number;
    validParsedLeads: number;
    savedLeads: number;
    duplicateSkipped: number;
    failedLeads: number;
    scrollMetrics: ScrollMetrics;
}
declare const LOG_PREFIXES: {
    readonly crawler: "[Crawler]";
    readonly parser: "[Parser]";
    readonly validator: "[Validator]";
    readonly verifier: "[Verifier]";
    readonly saver: "[Saver]";
};
export declare function crawlLog(component: keyof typeof LOG_PREFIXES, message: string, data?: Record<string, unknown>): void;
export declare function stabilizeInfiniteScroll(scrollFn: () => Promise<number>, options?: {
    maxEmptyScrolls?: number;
    scrollDelay?: number;
    retryCount?: number;
}): Promise<ScrollMetrics>;
export declare function sleep(ms: number): Promise<void>;
export declare function createCrawlResult(overrides?: Partial<CrawlResult>): CrawlResult;
export declare function logCrawlSummary(result: CrawlResult): void;
export {};
//# sourceMappingURL=crawl-engine.d.ts.map