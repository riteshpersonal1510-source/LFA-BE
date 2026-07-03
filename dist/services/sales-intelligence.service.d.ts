import { ILead } from '../models/Lead';
interface SalesIntelligenceOptions {
    timeout?: number;
}
interface BulkSalesResult {
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
export declare class SalesIntelligenceService {
    private readonly maxConcurrent;
    private readonly limit;
    analyzeLead(leadId: string, _options?: SalesIntelligenceOptions): Promise<ILead | null>;
    analyzeMultipleLeads(leadIds: string[], options?: SalesIntelligenceOptions): Promise<BulkSalesResult>;
    analyzeLeadsWithoutAnalysis(options?: SalesIntelligenceOptions & {
        limit?: number;
    }): Promise<BulkSalesResult>;
    getSalesStats(): Promise<{
        total: number;
        analyzed: number;
        notAnalyzed: number;
        averageAiScore: number;
        urgentLeads: number;
        highPriorityLeads: number;
        highConversionLeads: number;
        highRedesignPotential: number;
        highSeoOpportunity: number;
        enterpriseRevenue: number;
        highRevenue: number;
    }>;
    private getCompetitorContext;
}
export declare const salesIntelligenceService: SalesIntelligenceService;
export {};
//# sourceMappingURL=sales-intelligence.service.d.ts.map