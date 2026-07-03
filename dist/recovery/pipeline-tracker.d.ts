export declare enum PipelineStage {
    DISCOVERY = "DISCOVERY",
    EXTRACTION = "EXTRACTION",
    WEBSITE_CRAWL = "WEBSITE_CRAWL",
    ENRICHMENT = "ENRICHMENT",
    MONGODB = "MONGODB",
    API = "API",
    FRONTEND = "FRONTEND"
}
export type StageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export interface StageRecord {
    stage: PipelineStage;
    status: StageStatus;
    startedAt: string;
    completedAt?: string;
    durationMs?: number;
    error?: string;
    retries: number;
    metadata?: Record<string, unknown>;
}
export interface PipelineState {
    sessionId: string;
    keyword: string;
    stages: Record<PipelineStage, StageRecord>;
    overallStatus: 'running' | 'completed' | 'failed' | 'partial';
    startedAt: string;
    completedAt?: string;
    error?: string;
}
export declare function createPipeline(sessionId: string, keyword: string): PipelineState;
export declare function startStage(sessionId: string, stage: PipelineStage): void;
export declare function completeStage(sessionId: string, stage: PipelineStage, metadata?: Record<string, unknown>): void;
export declare function failStage(sessionId: string, stage: PipelineStage, error: string): void;
export declare function incrementRetry(sessionId: string, stage: PipelineStage): void;
export declare function getPipeline(sessionId: string): PipelineState | undefined;
export declare function getAllPipelines(): PipelineState[];
export declare function removePipeline(sessionId: string): void;
export declare function cleanupOldPipelines(maxAgeMs?: number): number;
//# sourceMappingURL=pipeline-tracker.d.ts.map