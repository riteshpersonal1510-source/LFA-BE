import { ILead } from '../models/Lead';
interface AIAnalysisRequest {
    companyName: string;
    website?: string;
    category?: string;
    websiteStatus?: string;
    sslEnabled?: boolean;
    responseTime?: number;
    metaTitle?: string;
    metaDescription?: string;
    hasContactPage?: boolean;
    hasSocialLinks?: boolean;
    rating?: number;
    reviewsCount?: number;
    leadScore?: number;
}
interface AIAnalysisResponse {
    leadScore: number;
    qualificationLevel: string;
    websiteWeaknesses: string[];
    businessOpportunities: string[];
    summary: string;
    analysisTimestamp: string;
}
interface AIBulkAnalysisResponse {
    totalProcessed: number;
    successful: number;
    failed: number;
    results: AIAnalysisResponse[];
}
export declare class AIClient {
    private client;
    private readonly baseUrl;
    private readonly timeout;
    constructor();
    analyzeLead(leadData: AIAnalysisRequest): Promise<AIAnalysisResponse>;
    analyzeBulkLeads(leads: AIAnalysisRequest[], batchSize?: number): Promise<AIBulkAnalysisResponse>;
    analyzeScoreOnly(leadData: AIAnalysisRequest): Promise<AIAnalysisResponse>;
    checkHealth(): Promise<boolean>;
}
export declare class AILeadAnalysisService {
    private client;
    constructor();
    analyzeLead(lead: ILead): Promise<ILead>;
    analyzeBulkLeads(leads: ILead[], batchSize?: number): Promise<{
        totalProcessed: number;
        successful: number;
        failed: number;
        leads: ILead[];
    }>;
    isServiceAvailable(): Promise<boolean>;
    private mapAIWebsiteStatus;
}
export declare const aiLeadAnalysisService: AILeadAnalysisService;
export {};
//# sourceMappingURL=ai-analysis.service.d.ts.map