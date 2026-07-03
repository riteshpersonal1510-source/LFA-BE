import type { IAreaAutomationSession, IAreaAutomationJob, StartAutomationRequest, AreaAutomationProgress, SessionFilterOptions } from './area-automation.types';
export declare class AreaAutomationEngine {
    startAutomation(req: StartAutomationRequest): Promise<IAreaAutomationSession>;
    saveDraft(req: StartAutomationRequest): Promise<IAreaAutomationSession>;
    getSession(sessionId: string): Promise<IAreaAutomationSession | null>;
    getJobs(sessionId: string, status?: string, businessType?: string, city?: string): Promise<IAreaAutomationJob[]>;
    getProgress(sessionId: string): Promise<AreaAutomationProgress | null>;
    getActiveSessions(): Promise<IAreaAutomationSession[]>;
    getRecentSessions(limit?: number): Promise<IAreaAutomationSession[]>;
    getSessionsWithFilters(filters: SessionFilterOptions): Promise<{
        sessions: IAreaAutomationSession[];
        total: number;
    }>;
    updateSession(sessionId: string, updates: Partial<StartAutomationRequest>): Promise<IAreaAutomationSession | null>;
    deleteSession(sessionId: string): Promise<boolean>;
    duplicateSession(sessionId: string): Promise<IAreaAutomationSession | null>;
    archiveSession(sessionId: string): Promise<IAreaAutomationSession | null>;
    stopAutomation(sessionId: string): Promise<IAreaAutomationSession | null>;
    pauseAutomation(sessionId: string): Promise<IAreaAutomationSession | null>;
    resumeAutomation(sessionId: string): Promise<IAreaAutomationSession>;
    restartAutomation(sessionId: string): Promise<IAreaAutomationSession | null>;
    getStats(): Promise<{
        total: number;
        running: number;
        completed: number;
        failed: number;
        paused: number;
        draft: number;
        totalLeads: number;
    }>;
    private waitForQueueIdle;
    private calculateSummary;
    private toSessionDTO;
    private toJobDTO;
}
export declare const areaAutomationEngine: AreaAutomationEngine;
//# sourceMappingURL=area-automation-engine.d.ts.map