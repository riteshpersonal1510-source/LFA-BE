import type { WebsiteIntelligenceReport, IntelligenceAnalysisOptions } from './types';
export declare class WebsiteIntelligenceEngine {
    private browser;
    initialize(): Promise<void>;
    cleanup(): Promise<void>;
    analyzeWebsite(url: string, options?: IntelligenceAnalysisOptions): Promise<WebsiteIntelligenceReport>;
    private collectPerformanceMetrics;
    private analyzeMeta;
    private analyzeSecurity;
    private analyzeSEO;
    private analyzeUI;
    private analyzeContent;
    private analyzeCategory;
    private detectIssues;
    private generateRecommendations;
    private calculateScores;
    private getDefaultReport;
}
export declare const websiteIntelligenceEngine: WebsiteIntelligenceEngine;
//# sourceMappingURL=engine.d.ts.map