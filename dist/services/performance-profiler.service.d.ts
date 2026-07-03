interface ProfilerEntry {
    name: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    metadata?: Record<string, unknown>;
}
export declare class PerformanceProfiler {
    private entries;
    private current;
    start(name: string, metadata?: Record<string, unknown>): void;
    end(): number;
    getEntries(): ProfilerEntry[];
    clear(): void;
    getLast(): ProfilerEntry | null;
    summary(): Record<string, {
        count: number;
        total: number;
        avg: number;
        max: number;
    }>;
}
export declare const profiler: PerformanceProfiler;
export {};
//# sourceMappingURL=performance-profiler.service.d.ts.map