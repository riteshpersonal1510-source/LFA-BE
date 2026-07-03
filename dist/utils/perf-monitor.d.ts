interface PerfEntry {
    operation: string;
    sessionId?: string;
    startTime: number;
    endTime?: number;
    durationMs?: number;
    metadata?: Record<string, unknown>;
}
declare class PerfMonitor {
    private entries;
    private active;
    private readonly MAX_ENTRIES;
    start(operation: string, sessionId?: string, metadata?: Record<string, unknown>): string;
    end(id: string, metadata?: Record<string, unknown>): number | null;
    measure<T>(operation: string, fn: () => Promise<T>, options?: {
        sessionId?: string;
        metadata?: Record<string, unknown>;
        log?: boolean;
    }): Promise<T>;
    getRecent(count?: number): PerfEntry[];
    getStats(operation?: string): {
        count: number;
        avgMs: number;
        minMs: number;
        maxMs: number;
        recentAvgMs: number;
    };
    getAllStats(): Record<string, {
        count: number;
        avgMs: number;
        minMs: number;
        maxMs: number;
        recentAvgMs: number;
    }>;
    reset(): void;
}
export declare const perfMonitor: PerfMonitor;
export {};
//# sourceMappingURL=perf-monitor.d.ts.map