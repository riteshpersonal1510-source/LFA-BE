import { BaseSource, LeadData, ScrapingResult } from '../source-core/base-source';
import { SourceQuery } from '../services/search-query-builder';
interface ScrapeError {
    source: string;
    keyword: string;
    error: string;
    retryable: boolean;
}
export interface MultiSourceRequest {
    keyword: string;
    location?: string;
    sources: string[];
    limit: number;
    state?: string;
    city?: string;
    area?: string;
    businessType?: string;
    sessionId?: string;
    semanticExpansion?: boolean;
}
export interface MultiSourceResult {
    success: boolean;
    message: string;
    results: {
        [sourceName: string]: ScrapingResult;
    };
    totalExtracted: number;
    totalStored: number;
    totalDuplicates: number;
    leads: LeadData[];
    sourceQueries: SourceQuery[];
    partialSuccess?: boolean;
    errors?: ScrapeError[];
}
export interface SourceStatus {
    name: string;
    enabled: boolean;
    status: 'active' | 'disabled' | 'error';
    lastRun?: Date;
    successRate?: number;
}
export declare class SourceManager {
    private sources;
    private allLeads;
    private errors;
    private activeSearch;
    constructor();
    isSearchActive(): boolean;
    registerSource(source: BaseSource): void;
    unregisterSource(sourceName: string): boolean;
    getSource(sourceName: string): BaseSource | undefined;
    getAllSources(): BaseSource[];
    scrapeMultiSource(request: MultiSourceRequest): Promise<MultiSourceResult>;
    scrapeMultiSourceSemantic(request: MultiSourceRequest): Promise<MultiSourceResult>;
    getAllLeads(): LeadData[];
    getSourcesStatus(): SourceStatus[];
    enableSource(sourceName: string): boolean;
    disableSource(sourceName: string): boolean;
    clearSearchState(): void;
}
export declare const sourceManager: SourceManager;
export {};
//# sourceMappingURL=source-manager.d.ts.map