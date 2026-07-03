export interface DashboardMetrics {
    generatedAt: string;
    period: {
        days: number;
        start: string;
        end: string;
    };
    searchStats: {
        total: number;
        completed: number;
        failed: number;
        stopped: number;
        partial: number;
        timeout: number;
        noResults: number;
    };
    leadStats: {
        total: number;
        withWebsite: number;
        withPhone: number;
        withEmail: number;
        enriched: number;
        pendingEnrichment: number;
    };
    sourcePerformance: SourcePerformance[];
    pipelineStatus: {
        activePipelines: number;
        queuedTasks: number;
        activeTasks: number;
    };
    dailyTrend: Array<{
        date: string;
        searches: number;
        leadsFound: number;
        leadsSaved: number;
    }>;
}
export interface SourcePerformance {
    source: string;
    totalSearches: number;
    successCount: number;
    failureCount: number;
    successRate: number;
    failureRate: number;
    avgDurationMs: number;
    totalLeads: number;
    avgLeadsPerSearch: number;
}
export declare function getDashboardMetrics(days?: number): Promise<DashboardMetrics>;
//# sourceMappingURL=dashboard-metrics.d.ts.map