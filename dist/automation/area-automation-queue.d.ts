export declare class AreaAutomationQueue {
    private processingSessions;
    private activeJobBySession;
    private stopRequestedBySession;
    enqueueJobs(sessionId: string, jobs: Array<{
        businessType: string;
        state: string;
        city: string;
        area: string;
        country?: string;
        sources: string[];
    }>): Promise<void>;
    startProcessing(sessionId: string): Promise<void>;
    private processJob;
    stopProcessing(sessionId?: string): Promise<void>;
    isProcessing(sessionId?: string): boolean;
    getActiveJobId(sessionId: string): string | null;
}
export declare const areaAutomationQueue: AreaAutomationQueue;
//# sourceMappingURL=area-automation-queue.d.ts.map