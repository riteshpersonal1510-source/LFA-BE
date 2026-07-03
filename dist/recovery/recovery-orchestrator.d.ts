import { PipelineStage, createPipeline, getPipeline, getAllPipelines } from './pipeline-tracker';
import { RetryConfig } from './retry-policy';
export interface QueueTask {
    id: string;
    sessionId: string;
    stage: PipelineStage;
    label: string;
    execute: () => Promise<void>;
    retryConfig?: Partial<RetryConfig>;
}
declare class QueueManager {
    private queue;
    private activeCount;
    private processing;
    private processingIds;
    private paused;
    enqueue(task: QueueTask): boolean;
    getStatus(): {
        queueLength: number;
        activeCount: number;
        maxConcurrent: number;
        processingIds: number;
        paused: boolean;
    };
    pause(): void;
    resume(): void;
    clear(): number;
    private processNext;
    private runTask;
}
export declare class RecoveryOrchestrator {
    private queueManager;
    private cleanupInterval;
    constructor();
    start(): void;
    stop(): void;
    createPipeline(sessionId: string, keyword: string): ReturnType<typeof createPipeline>;
    submitTask(task: QueueTask): boolean;
    getPipeline(sessionId: string): ReturnType<typeof getPipeline>;
    getAllPipelines(): ReturnType<typeof getAllPipelines>;
    getQueueStatus(): ReturnType<QueueManager['getStatus']>;
    pauseQueue(): void;
    resumeQueue(): void;
    clearQueue(): number;
    getSearchHistoryStats(days?: number): Promise<{
        total: number;
        completed: number;
        failed: number;
        stopped: number;
        partial: number;
        timeout: number;
        noResults: number;
        bySource: Record<string, {
            total: number;
            success: number;
            failure: number;
        }>;
        avgDurationMs: number;
    }>;
    getSourceMetrics(days?: number): Promise<Array<{
        source: string;
        totalSearches: number;
        successCount: number;
        failureCount: number;
        successRate: number;
        failureRate: number;
        avgExtractionMs: number;
        avgEnrichmentMs: number;
        retryCount: number;
    }>>;
}
export declare const recoveryOrchestrator: RecoveryOrchestrator;
export {};
//# sourceMappingURL=recovery-orchestrator.d.ts.map