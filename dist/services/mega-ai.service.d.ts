export declare class MegaAIService {
    analyzeLead(leadId: string): Promise<import("../mega-ai-engine/mega-ai-orchestrator").MegaPipelineResult>;
    analyzeMultipleLeads(leadIds: string[]): Promise<{
        results: import("../mega-ai-engine/mega-ai-orchestrator").MegaPipelineResult[];
        successful: number;
        failed: number;
        total: number;
        totalDuration: number;
    }>;
    analyzePendingLeads(limit?: number): Promise<{
        results: import("../mega-ai-engine/mega-ai-orchestrator").MegaPipelineResult[];
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
export declare const megaAIService: MegaAIService;
//# sourceMappingURL=mega-ai.service.d.ts.map