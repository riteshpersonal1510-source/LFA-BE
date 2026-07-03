export interface ScraperSessionData {
    id: string;
    keyword: string;
    location: string;
    limit: number;
    startTime: Date;
    endTime?: Date;
    status: 'pending' | 'running' | 'completed' | 'failed';
    result?: {
        totalExtracted: number;
        totalStored: number;
        totalDuplicates: number;
    };
    error?: string;
    retryCount: number;
}
export declare class ScraperSession {
    readonly id: string;
    readonly keyword: string;
    readonly location: string;
    readonly limit: number;
    startTime: Date;
    endTime?: Date;
    status: 'pending' | 'running' | 'completed' | 'failed';
    result?: {
        totalExtracted: number;
        totalStored: number;
        totalDuplicates: number;
    };
    error?: string;
    retryCount: number;
    constructor(keyword: string, location: string, limit: number);
    start(): void;
    complete(result: {
        totalExtracted: number;
        totalStored: number;
        totalDuplicates: number;
    }): void;
    fail(error: string): void;
    incrementRetry(): void;
    getDuration(): number;
    getInfo(): ScraperSessionData;
}
//# sourceMappingURL=scraper-session.d.ts.map