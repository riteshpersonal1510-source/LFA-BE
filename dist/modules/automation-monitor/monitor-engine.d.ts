import type { IExecutionLog, MonitorStats, SessionLiveStatus, MonitorLogEntry } from './monitor.types';
export declare class MonitorEngine {
    private sessionMemoryLogs;
    private sessionStartTime;
    onAutomationCreated(sessionId: string, name: string): void;
    onAutomationStarted(sessionId: string): void;
    onAutomationLog(sessionId: string, message: string, level?: MonitorLogEntry['level']): void;
    onJobStarted(job: {
        _id: string;
        sessionId: string;
        businessType: string;
        state: string;
        city: string;
        area?: string;
        sources: string[];
        queuePosition: number;
        totalJobs: number;
    }): Promise<void>;
    onJobProgress(job: {
        _id: string;
        sessionId: string;
        area?: string;
        city: string;
        progress: string;
        totalLeads?: number;
        currentStage?: string;
        sourceResults?: Array<{
            source: string;
            totalStored: number;
        }>;
    }): Promise<void>;
    onJobCompleted(job: {
        _id: string;
        sessionId: string;
        area?: string;
        city: string;
        businessType: string;
        sources: string[];
        totalLeads: number;
        sourceResults: Array<{
            source: string;
            totalStored: number;
        }>;
    }): Promise<void>;
    onJobFailed(job: {
        _id: string;
        sessionId: string;
        area?: string;
        city: string;
        businessType: string;
        error: string;
    }): Promise<void>;
    onSessionCompleted(sessionId: string): void;
    onSessionFailed(sessionId: string, reason: string): void;
    onSessionStopped(sessionId: string): void;
    onSessionResumed(sessionId: string): void;
    onLeadSaved(sessionId: string, businessName: string, source: string, totalSaved: number): void;
    onDuplicateSkipped(sessionId: string, businessName: string, totalDuplicates: number): void;
    onLeadRejected(sessionId: string, businessName: string, totalRejected: number): void;
    emitSessionProgress(sessionId: string): Promise<void>;
    getLogs(sessionId: string, limit?: number): Promise<IExecutionLog[]>;
    getLiveStatus(sessionId: string): Promise<SessionLiveStatus | null>;
    getStats(sessionId: string): Promise<MonitorStats>;
    clearMemoryLogs(sessionId: string): void;
    getMemoryLogs(sessionId: string): MonitorLogEntry[];
    private addToMemoryLog;
}
export declare const monitorEngine: MonitorEngine;
//# sourceMappingURL=monitor-engine.d.ts.map