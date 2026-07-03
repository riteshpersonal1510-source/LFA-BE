export interface SemanticQueryProgress {
    queryId: string;
    keyword: string;
    source: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    leadsFound: number;
    leadsStored: number;
    error: string | null;
    startedAt: string | null;
    completedAt: string | null;
    durationMs: number;
    retriesUsed: number;
}
export interface ScrapingProgressData {
    sessionId: string;
    keyword: string;
    location: string;
    area: string;
    city: string;
    state: string;
    businessType: string;
    status: 'running' | 'completed' | 'failed';
    totalFound: number;
    totalScraped: number;
    totalSaved: number;
    totalDuplicates: number;
    totalRejected: number;
    errors: string[];
    startedAt: string;
    updatedAt: string;
    semanticQueries?: SemanticQueryProgress[];
    totalSemanticQueries?: number;
    completedSemanticQueries?: number;
    failedSemanticQueries?: number;
    isPartialSuccess?: boolean;
}
declare class ScrapingProgressTracker {
    private sessions;
    createSession(sessionId: string, data: Partial<ScrapingProgressData>): ScrapingProgressData;
    createSemanticSession(sessionId: string, data: Partial<ScrapingProgressData>, totalQueries: number): ScrapingProgressData;
    updateSemanticQueryProgress(sessionId: string, queryIndex: number, updates: Partial<SemanticQueryProgress>): void;
    setSemanticQueryCompleted(sessionId: string, queryIndex: number): void;
    setSemanticQueryFailed(sessionId: string, queryIndex: number, error: string): void;
    setSemanticQuerySkipped(sessionId: string, queryIndex: number, reason: string): void;
    markPartialSuccess(sessionId: string): void;
    updateProgress(sessionId: string, updates: Partial<ScrapingProgressData>): void;
    incrementFound(sessionId: string, count?: number): void;
    incrementScraped(sessionId: string, count?: number): void;
    incrementSaved(sessionId: string, count?: number): void;
    incrementDuplicates(sessionId: string, count?: number): void;
    incrementRejected(sessionId: string, count?: number): void;
    getProgress(sessionId: string): ScrapingProgressData | null;
    completeSession(sessionId: string): void;
    failSession(sessionId: string, error: string): void;
    generateSessionId(): string;
    cleanupOldSessions(maxAgeMs?: number): void;
}
export declare const scrapingProgress: ScrapingProgressTracker;
export {};
//# sourceMappingURL=scraping-progress.d.ts.map