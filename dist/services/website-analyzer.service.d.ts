import { WebsiteAnalysis, LeadAnalysis, AnalysisResult } from '../types/analysis.types';
interface AnalysisOptions {
    timeout?: number;
    followRedirects?: boolean;
}
interface AnalysisOptions {
    timeout?: number;
    followRedirects?: boolean;
}
export declare class WebsiteAnalyzerService {
    private defaultTimeout;
    private userAgents;
    analyzeWebsite(website: string, options?: AnalysisOptions): Promise<WebsiteAnalysis>;
    analyzeLead(leadId: string, website: string): Promise<LeadAnalysis>;
    analyzeBulk(leads: Array<{
        id: string;
        website?: string;
    }>, options?: {
        limit?: number;
    }): Promise<AnalysisResult>;
    private determineWebsiteStatus;
    private calculateLeadScore;
    private determineQualificationLevel;
    private extractMetaTitle;
    private extractMetaDescription;
    private detectContactPage;
    private detectSocialLinks;
    private checkMobileFriendly;
    private checkModernStructure;
    private calculateSeoScore;
    private calculateQualityScore;
    private detectIssues;
    private normalizeUrl;
    private getRandomUserAgent;
}
export declare const websiteAnalyzerService: WebsiteAnalyzerService;
export {};
//# sourceMappingURL=website-analyzer.service.d.ts.map