export type DateRange = 'today' | 'last7days' | 'last30days' | 'custom';
export interface DateRangeFilter {
    startDate?: Date;
    endDate?: Date;
}
export interface LeadAnalytics {
    totalLeads: number;
    highPotential: number;
    mediumPotential: number;
    lowPotential: number;
    averageLeadScore: number;
    qualificationDistribution: {
        highPotential: number;
        mediumPotential: number;
        lowPotential: number;
        total: number;
    };
}
export interface ScrapingAnalytics {
    totalScrapes: number;
    successfulScrapes: number;
    failedScrapes: number;
    successRate: number;
    leadsPerScrape: number;
}
export interface AutomationAnalytics {
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    successRate: number;
    totalLeadsGenerated: number;
    exportsGenerated: number;
}
export interface ExportAnalytics {
    totalExports: number;
    csvExports: number;
    excelExports: number;
    totalRecords: number;
}
export interface OverviewAnalytics {
    totalLeads: number;
    websitesAnalyzed: number;
    emailsFound: number;
    phoneNumbers: number;
    totalAutomations: number;
    highPotentialLeads: number;
    websitesWithoutSsl: number;
    noWebsiteBusinesses: number;
    emailsExtracted: number;
    automationRuns: number;
    exportsGenerated: number;
    totalScrapes: number;
    scrapingSuccessRate: number;
    responsiveAudited: number;
    averageResponsiveScore: number;
    averageUIUXScore: number;
    mobileUnfriendlyWebsites: number;
    layoutIssuesDetected: number;
    intelligenceAnalyzed: number;
    averageTrustScore: number;
    averageQualityScore: number;
    highOpportunityLeads: number;
    outdatedWebsites: number;
    businessesWithoutSocial: number;
    salesIntelligenceAnalyzed: number;
    urgentSalesLeads: number;
    highConversionLeads: number;
    averageAiScore: number;
    highSeoOpportunities: number;
    highRedesignOpportunities: number;
    outreachCompleted: number;
    pendingOutreach: number;
    highProbabilityOutreach: number;
    outreachResponded: number;
    outreachInterested: number;
    fullPipelineCompleted: number;
    pendingFullPipeline: number;
}
export interface CategoryCount {
    _id: string;
    count: number;
}
export interface LeadPerDay {
    _id: {
        year: number;
        month: number;
        day: number;
    };
    count: number;
}
export interface AreaDensityItem {
    state: string;
    city: string;
    area: string;
    totalLeads: number;
    densityLevel: 'high' | 'medium' | 'low';
    topCategories: Array<{
        category: string;
        count: number;
    }>;
}
export declare class AnalyticsService {
    getOverview(filter?: DateRangeFilter): Promise<OverviewAnalytics>;
    getLeadAnalytics(filter?: DateRangeFilter): Promise<LeadAnalytics>;
    getScrapingAnalytics(filter?: DateRangeFilter): Promise<ScrapingAnalytics>;
    getAutomationAnalytics(filter?: DateRangeFilter): Promise<AutomationAnalytics>;
    getCategoryDistribution(filter?: DateRangeFilter): Promise<CategoryCount[]>;
    getLeadsPerDay(filter?: DateRangeFilter): Promise<LeadPerDay[]>;
    getQualificationDistribution(filter?: DateRangeFilter): Promise<CategoryCount[]>;
    getWebsiteStatusDistribution(filter?: DateRangeFilter): Promise<CategoryCount[]>;
    getAreaDensity(filter?: DateRangeFilter): Promise<AreaDensityItem[]>;
    getTopAreas(filter?: DateRangeFilter, limit?: number): Promise<AreaDensityItem[]>;
    getTopLocations(filter?: DateRangeFilter): Promise<CategoryCount[]>;
    getHighestScoringBusinesses(filter?: DateRangeFilter, limit?: number): Promise<Record<string, unknown>[]>;
    getRecentScrapingHistory(limit?: number): Promise<Record<string, unknown>[]>;
    private getDateRangeQuery;
}
export declare const analyticsService: AnalyticsService;
//# sourceMappingURL=analytics.service.d.ts.map