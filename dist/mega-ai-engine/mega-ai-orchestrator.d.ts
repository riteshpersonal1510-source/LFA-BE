export interface MegaPipelineResult {
    leadId: string;
    companyName: string;
    responsiveAudit: boolean;
    businessIntelligence: boolean;
    salesIntelligence: boolean;
    outreach: boolean;
    crmUpdate: boolean;
    errors: string[];
    duration: number;
}
export declare class MegaAIOrchestrator {
    runFullPipeline(leadId: string): Promise<MegaPipelineResult>;
    runFullPipelineForMultiple(leadIds: string[]): Promise<{
        results: MegaPipelineResult[];
        successful: number;
        failed: number;
        total: number;
        totalDuration: number;
    }>;
    runFullPipelineForPendingLeads(limit?: number): Promise<{
        results: MegaPipelineResult[];
        successful: number;
        failed: number;
        total: number;
    }>;
    getPipelineStats(): Promise<{
        totalLeads: number;
        withWebsite: number;
        responsiveCompleted: number;
        intelligenceCompleted: number;
        salesCompleted: number;
        outreachCompleted: number;
        fullPipelineCompleted: number;
        pendingFullPipeline: number;
    }>;
}
export declare const megaAIOrchestrator: MegaAIOrchestrator;
//# sourceMappingURL=mega-ai-orchestrator.d.ts.map