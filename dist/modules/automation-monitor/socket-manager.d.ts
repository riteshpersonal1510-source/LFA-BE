import { Server as HTTPServer } from 'http';
import { Server } from 'socket.io';
export declare function initSocketManager(httpServer: HTTPServer): Server;
export declare function getSocketIO(): Server | null;
export declare function emitToSession(sessionId: string, event: string, data: unknown): void;
export declare function emitToAll(event: string, data: unknown): void;
export declare function emitJobStarted(sessionId: string, data: {
    jobId: string;
    area: string;
    city: string;
    businessType: string;
    sources: string[];
    queuePosition: number;
    totalJobs: number;
}): void;
export declare function emitJobProgress(sessionId: string, data: {
    jobId: string;
    area: string;
    city: string;
    progress: string;
    totalLeads?: number;
    currentStage?: string;
    sourceResults?: Array<{
        source: string;
        totalStored: number;
    }>;
}): void;
export declare function emitJobCompleted(sessionId: string, data: {
    jobId: string;
    area: string;
    city: string;
    totalLeads: number;
    duration: number;
    sources: string[];
}): void;
export declare function emitJobFailed(sessionId: string, data: {
    jobId: string;
    area: string;
    city: string;
    error: string;
    duration: number;
}): void;
export declare function emitSessionStatus(sessionId: string, status: string, data?: Record<string, unknown>): void;
export declare function emitLogAdded(sessionId: string, logEntry: {
    timestamp: string;
    message: string;
    level: string;
}): void;
export declare function emitAutomationCreated(sessionId: string, data: {
    name: string;
}): void;
export declare function emitAutomationStarted(sessionId: string): void;
export declare function emitSessionProgress(sessionId: string, data: Record<string, unknown>): void;
export declare function emitLeadRejected(sessionId: string, data: {
    businessName: string;
    totalRejected: number;
}): void;
export declare function emitSearchStart(sessionId: string, data: {
    keyword: string;
    location: string;
    state?: string;
    city?: string;
    area?: string;
    sources: string[];
}): void;
export declare function emitSearchProgress(sessionId: string, data: {
    foundCount: number;
    savedCount: number;
    duplicateCount: number;
    failedCount: number;
    progress: number;
    currentSource: string;
    currentLead: string;
    currentStage?: string;
    currentUrl?: string;
    eta?: number;
    totalProcessed?: number;
    updatedAt: string;
}): void;
export declare function emitSearchLog(sessionId: string, entry: {
    timestamp: string;
    message: string;
    level: string;
}): void;
export declare function emitSearchStage(sessionId: string, stage: string): void;
export declare function emitSearchHeartbeat(sessionId: string, data: {
    timestamp: string;
}): void;
export declare function emitLeadFound(sessionId: string, data: {
    businessName: string;
    source: string;
    totalLeads: number;
}): void;
export declare function emitSourceUpdate(sessionId: string, data: {
    source: string;
    count: number;
    status: 'searching' | 'completed' | 'failed';
}): void;
export declare function emitSearchCompleted(sessionId: string, data: {
    keyword: string;
    location: string;
    totalLeads: number;
    uniqueLeads: number;
    duplicatesRemoved: number;
    failedCount?: number;
    sourceBreakdown: Record<string, number>;
    durationMs: number;
    state?: string;
    city?: string;
    area?: string;
    sources?: string[];
    status?: string;
    progress?: number;
    finishedAt?: string;
}): void;
export declare function emitSearchStopped(sessionId: string): void;
export declare function emitSearchTimeout(sessionId: string, data: {
    error: string;
}): void;
export declare function emitSearchNoResults(sessionId: string, data: {
    message: string;
}): void;
export declare function emitSearchGoogleBlocked(sessionId: string, data: {
    error: string;
}): void;
export declare function emitSearchHistoryUpdate(sessionId: string, data: {
    keyword: string;
    state?: string;
    city?: string;
    area?: string;
    country?: string;
    sources: string[];
    totalLeads: number;
    startedAt: string;
    completedAt: string;
    duration: number;
    status: string;
    businessesFound?: number;
    businessesSaved?: number;
    duplicates?: number;
    progress?: number;
    maxProgressReached?: number;
    failureReason?: string;
    failureClassification?: string;
    searchSessionId?: string;
}): void;
export declare function emitSearchError(sessionId: string, data: {
    error: string;
}): void;
export declare function emitSearchRecovered(sessionId: string, data: {
    keyword: string;
    location: string;
    state?: string;
    city?: string;
    area?: string;
    sources: string[];
    leadsFound: number;
    uniqueLeads: number;
    duplicatesRemoved: number;
    failedCount: number;
    progressPercentage: number;
    elapsedMs: number;
}): void;
export declare function emitLeadSaved(sessionId: string, data: {
    businessName?: string;
    source?: string;
    totalSaved: number;
}): void;
export declare function emitDuplicateRemoved(sessionId: string, data: {
    businessName?: string;
    totalDuplicates: number;
}): void;
export declare function emitLeadEnrichmentStarted(leadId: string): void;
export declare function emitLeadEnrichmentStep(leadId: string, data: {
    step: string;
    stepIndex: number;
    totalSteps: number;
    progress: number;
    status: 'running' | 'completed' | 'failed' | 'skipped';
    error?: string;
}): void;
export declare function emitLeadEnrichmentCompleted(leadId: string, data: {
    duration: number;
    totalSteps: number;
    errors: number;
}): void;
export declare function emitLeadEnrichmentFailed(leadId: string, data: {
    error: string;
    duration: number;
    completedSteps: number;
    totalSteps: number;
}): void;
export declare function emitEmailDiscoveryUpdate(leadId: string, data: {
    status: string;
    primaryEmail?: string;
    emailCount?: number;
    error?: string;
}): void;
export declare function emitLeadBusinessFound(sessionId: string, data: {
    leadId: string;
    companyName: string;
    source: string;
    totalFound: number;
}): void;
export declare function emitLeadBusinessProcessing(sessionId: string, data: {
    leadId: string;
    companyName: string;
    step: string;
}): void;
export declare function emitLeadBusinessAnalyzing(sessionId: string, data: {
    leadId: string;
    companyName: string;
    step: string;
    progress: number;
}): void;
export declare function emitLeadBusinessCompleted(sessionId: string, data: {
    leadId: string;
    companyName: string;
    leadScore?: number;
    hasWebsite?: boolean;
    hasEmail?: boolean;
    hasPhone?: boolean;
}): void;
//# sourceMappingURL=socket-manager.d.ts.map