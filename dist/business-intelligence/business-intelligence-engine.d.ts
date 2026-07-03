import { BusinessIntelligenceReport, IntelligenceAnalysisOptions } from './types';
export declare class BusinessIntelligenceEngine {
    private browser;
    private readonly maxConcurrent;
    private readonly limit;
    initialize(): Promise<void>;
    cleanup(): Promise<void>;
    analyzeWebsite(url: string, existingData: {
        sslEnabled?: boolean;
        seoScore?: number;
        responsiveScore?: number;
        uiuxScore?: number;
        responseTime?: number;
    }, options?: IntelligenceAnalysisOptions): Promise<BusinessIntelligenceReport>;
    private calculatePerformanceScore;
    private normalizeUrl;
    private preventSSRF;
    private getDefaultReport;
}
export declare const businessIntelligenceEngine: BusinessIntelligenceEngine;
//# sourceMappingURL=business-intelligence-engine.d.ts.map