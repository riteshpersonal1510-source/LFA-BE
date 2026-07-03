export interface PerformanceAuditResult {
    loadTimeMs: number;
    domReadyMs: number;
    lcpEstimateMs: number;
    pageWeightKB: number;
    requestCount: number;
    heavyImages: number;
    largeScripts: number;
    renderBlockingResources: number;
    score: number;
    issues: string[];
}
export declare class PerformanceAuditService {
    auditUrl(url: string): Promise<PerformanceAuditResult>;
}
export declare const performanceAuditService: PerformanceAuditService;
//# sourceMappingURL=performance-audit.service.d.ts.map