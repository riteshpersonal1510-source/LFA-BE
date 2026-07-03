import { ILead } from '../models/Lead';
interface BusinessIntelligenceOptions {
    timeout?: number;
    includeDeepAnalysis?: boolean;
}
interface BulkIntelligenceResult {
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
export declare class BusinessIntelligenceService {
    private readonly maxConcurrent;
    private readonly limit;
    analyzeLead(leadId: string, options?: BusinessIntelligenceOptions): Promise<ILead | null>;
    analyzeMultipleLeads(leadIds: string[], options?: BusinessIntelligenceOptions): Promise<BulkIntelligenceResult>;
    analyzeLeadsWithoutIntelligence(options?: BusinessIntelligenceOptions & {
        limit?: number;
    }): Promise<BulkIntelligenceResult>;
    getIntelligenceStats(): Promise<{
        total: number;
        analyzed: number;
        notAnalyzed: number;
        averageTrustScore: number;
        averageQualityScore: number;
        highOpportunity: number;
        mediumOpportunity: number;
        lowOpportunity: number;
        websitesWithOutdatedDesign: number;
        businessesWithoutSocial: number;
        businessesWithoutContactForm: number;
        weakTrustScore: number;
        outdatedCopyright: number;
    }>;
    reanalyzeLead(leadId: string, options?: BusinessIntelligenceOptions): Promise<ILead | null>;
}
export declare const businessIntelligenceService: BusinessIntelligenceService;
export {};
//# sourceMappingURL=business-intelligence.service.d.ts.map