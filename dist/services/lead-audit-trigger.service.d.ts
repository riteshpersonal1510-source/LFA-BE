export interface AuditTriggerResult {
    leadId: string;
    responsiveAuditTriggered: boolean;
    businessIntelligenceTriggered: boolean;
    websiteIntelligenceTriggered: boolean;
    responsiveAuditStatus?: string;
    businessIntelligenceStatus?: string;
    websiteIntelligenceStatus?: string;
    errors?: string[];
}
export declare class LeadAuditTriggerService {
    private readonly maxConcurrent;
    private readonly limit;
    triggerMissingAuditsForLead(leadId: string, waitForCompletion?: boolean): Promise<AuditTriggerResult>;
    triggerMissingAuditsForMultipleLeads(leadIds: string[]): Promise<AuditTriggerResult[]>;
    triggerAllMissingAudits(options?: {
        limit?: number;
    }): Promise<{
        total: number;
        responsiveAuditTriggered: number;
        businessIntelligenceTriggered: number;
        completed: number;
        failed: number;
    }>;
}
export declare const leadAuditTriggerService: LeadAuditTriggerService;
//# sourceMappingURL=lead-audit-trigger.service.d.ts.map