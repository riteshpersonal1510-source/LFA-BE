export interface LeadStatistics {
    totalLeads: number;
    websiteCount: number;
    noWebsiteCount: number;
    withPhoneCount: number;
    withoutPhoneCount: number;
    pendingCount: number;
    preparedCount: number;
    sentCount: number;
    skippedCount: number;
    failedCount: number;
    leadIds: string[];
    mongoQuery: Record<string, unknown>;
    appliedFilters: string[];
}
export declare class LeadStatisticsService {
    private baseQuery;
    getLeadStatistics(): Promise<LeadStatistics>;
}
export declare const leadStatisticsService: LeadStatisticsService;
//# sourceMappingURL=lead-statistics.service.d.ts.map