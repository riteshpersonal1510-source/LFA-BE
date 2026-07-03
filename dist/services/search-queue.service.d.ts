import { ScrapeOptions } from './scraper.service';
declare class SearchQueueService {
    private scraperService;
    private activeSessions;
    private stopRequested;
    private queue;
    private sessionLocks;
    private abortControllers;
    isRunning(sessionId: string): boolean;
    isStopRequested(sessionId: string): boolean;
    enqueue(sessionId: string, options: ScrapeOptions): Promise<void>;
    stop(sessionId: string): Promise<void>;
    resume(sessionId: string): Promise<void>;
    private processNext;
    private executeJob;
    reset(): void;
    recoverStuckSessions(): Promise<void>;
}
export declare const searchQueue: SearchQueueService;
export interface CleanupSummary {
    sessionsRemoved: number;
    analyticsRemoved: number;
    queueReset: boolean;
    inMemoryCleared: boolean;
    browserPoolRecreated: boolean;
    scraperBrowserReset: boolean;
    workersStopped: boolean;
    leadCacheCleared: boolean;
    orphanLeads: number;
    errors: string[];
}
declare class SearchCleanupService {
    resetAll(deleteCompleted?: boolean): Promise<CleanupSummary>;
    startupCleanup(): Promise<void>;
}
export declare const searchCleanup: SearchCleanupService;
export {};
//# sourceMappingURL=search-queue.service.d.ts.map