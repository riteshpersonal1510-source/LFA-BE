import { ILead } from '../models/Lead';
interface ResponsiveAuditOptions {
    timeout?: number;
    skipScreenshots?: boolean;
    screenshotQuality?: number;
}
interface BulkAuditResult {
    success: boolean;
    message: string;
    totalProcessed: number;
    successful: number;
    failed: number;
    results: Array<{
        leadId: string;
        success: boolean;
        error?: string;
    }>;
}
export declare class ResponsiveAuditService {
    private readonly maxConcurrent;
    private readonly limit;
    auditLead(leadId: string, options?: ResponsiveAuditOptions): Promise<ILead | null>;
    auditMultipleLeads(leadIds: string[], options?: ResponsiveAuditOptions): Promise<BulkAuditResult>;
    auditLeadsWithoutAudit(options?: ResponsiveAuditOptions & {
        limit?: number;
    }): Promise<BulkAuditResult>;
    getAuditStats(): Promise<{
        total: number;
        audited: number;
        notAudited: number;
        averageResponsiveScore: number;
        averageUiuxScore: number;
        averageMobileScore: number;
        mobileUnfriendly: number;
        layoutIssues: number;
        alignmentIssues: number;
        horizontalScrollIssues: number;
    }>;
    reauditLead(leadId: string, options?: ResponsiveAuditOptions): Promise<ILead | null>;
}
export declare const responsiveAuditService: ResponsiveAuditService;
export {};
//# sourceMappingURL=responsive-audit.service.d.ts.map