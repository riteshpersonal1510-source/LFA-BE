import type { ExpandedKeyword } from '../modules/search/businessCategoryEngine';
export interface QueryCoverage {
    keyword: string;
    originalKeyword: string;
    categoryGroup: string;
    priority: number;
    source: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    leadsDiscovered: number;
    startTime?: number;
    endTime?: number;
    durationMs?: number;
    error?: string;
}
export interface SearchSessionCoverage {
    sessionId: string;
    originalKeyword: string;
    matchedCategory: string | null;
    totalQueries: number;
    completedQueries: number;
    failedQueries: number;
    totalLeadsDiscovered: number;
    totalLeadsStored: number;
    totalDuplicatesRemoved: number;
    queries: QueryCoverage[];
    startTime: number;
    endTime?: number;
    durationMs?: number;
}
type SearchMetricsCallback = (metrics: SearchSessionCoverage) => void;
export declare class SearchCoverageService {
    private sessions;
    private listeners;
    createSession(sessionId: string, originalKeyword: string, expandedKeywords: ExpandedKeyword[], sources: string[]): SearchSessionCoverage;
    markQueryRunning(sessionId: string, keyword: string, source: string): void;
    markQueryCompleted(sessionId: string, keyword: string, source: string, leadsFound: number): void;
    markQueryFailed(sessionId: string, keyword: string, source: string, error: string): void;
    addDuplicates(sessionId: string, count: number): void;
    addStored(sessionId: string, count: number): void;
    completeSession(sessionId: string): void;
    getSession(sessionId: string): SearchSessionCoverage | undefined;
    getQueryCoverage(sessionId: string, keyword: string, source: string): QueryCoverage | undefined;
    subscribe(sessionId: string, callback: SearchMetricsCallback): void;
    unsubscribe(sessionId: string): void;
    private notifyListeners;
    getAggregateStats(): {
        totalSessions: number;
        totalQueries: number;
        totalCompletedQueries: number;
        totalFailedQueries: number;
        totalLeadsDiscovered: number;
        totalLeadsStored: number;
        totalDuplicatesRemoved: number;
        topCategories: Array<{
            category: string;
            leads: number;
            queries: number;
        }>;
    };
}
export declare const searchCoverageService: SearchCoverageService;
export {};
//# sourceMappingURL=search-coverage.service.d.ts.map