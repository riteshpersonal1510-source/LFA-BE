export interface BackfillStats {
    total: number;
    processed: number;
    skipped: number;
    succeeded: number;
    failed: number;
    errors: string[];
    startTime: Date;
    endTime?: Date;
    running: boolean;
}
export declare class BackfillWorker {
    private stats;
    private batchSize;
    private concurrency;
    get status(): BackfillStats;
    runBackfill(options?: {
        batchSize?: number;
        concurrency?: number;
        skipCompleted?: boolean;
        limit?: number;
        targetMissingFields?: boolean;
    }): Promise<BackfillStats>;
    reset(): void;
}
//# sourceMappingURL=backfill-worker.d.ts.map