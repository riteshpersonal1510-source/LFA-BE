import { ILead } from '../models/Lead';
interface IntelligenceOptions {
    timeout?: number;
    forceRefresh?: boolean;
}
interface BulkResult {
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
export declare class WebsiteIntelligenceService {
    private readonly maxConcurrent;
    private readonly limit;
    analyzeLead(leadId: string, options?: IntelligenceOptions): Promise<ILead | null>;
    analyzeMultipleLeads(leadIds: string[], options?: IntelligenceOptions): Promise<BulkResult>;
    reanalyzeLead(leadId: string, options?: IntelligenceOptions): Promise<ILead | null>;
    getIntelligenceStats(): Promise<{
        total: number;
        analyzed: number;
        notAnalyzed: number;
        averageTrustScore: number;
        averageQualityScore: number;
        highOpportunity: number;
    }>;
}
export declare const websiteIntelligenceService: WebsiteIntelligenceService;
export {};
//# sourceMappingURL=website-intelligence.service.d.ts.map