export declare class AreaQueueCancelledError extends Error {
    constructor(message?: string);
}
export declare class AreaQueue {
    private processingSessions;
    private activeJobBySession;
    private stopModeBySession;
    private heartbeatTimers;
    enqueueJobs(sessionId: string, jobs: Array<{
        businessType: string;
        state: string;
        city: string;
        area?: string;
        country?: string;
        sources: string[];
    }>): Promise<void>;
    startProcessing(sessionId: string): Promise<void>;
    private processJob;
    pauseProcessing(sessionId: string): Promise<void>;
    stopProcessing(sessionId?: string): Promise<void>;
    private abortActiveJob;
    private resetRunningJobToPending;
    private finalizePausedSession;
    private finalizeCompletedSession;
    syncSessionCounters(sessionId: string): Promise<void>;
    recoverStuckSessions(): Promise<void>;
    private createSearchHistoryEntry;
    private updateSearchHistoryOnComplete;
    private updateSearchHistoryOnFailed;
    private startHeartbeat;
    private stopHeartbeat;
    isProcessing(sessionId?: string): boolean;
    getActiveJobId(sessionId: string): string | null;
    getStatus(): Promise<{
        sessionsProcessing: number;
        sessions: Array<{
            sessionId: string;
            activeJobId: string | null;
        }>;
    }>;
}
export declare const areaQueue: AreaQueue;
//# sourceMappingURL=area-queue.d.ts.map