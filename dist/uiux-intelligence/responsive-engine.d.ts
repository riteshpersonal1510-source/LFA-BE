import { FullResponsiveAuditResult, ResponsiveAnalysisOptions } from './types';
export declare class ResponsiveEngine {
    private readonly maxConcurrent;
    private readonly limit;
    initialize(): Promise<void>;
    cleanup(): Promise<void>;
    analyzeWebsite(url: string, options?: ResponsiveAnalysisOptions): Promise<FullResponsiveAuditResult>;
    private analyzeViewport;
    private determineMobileFriendly;
    private determineResponsiveLayout;
    private mergeUIUXAudits;
    private getEmptyMetrics;
    private normalizeUrl;
    private preventSSRF;
    private getUserAgent;
}
export declare const responsiveEngine: ResponsiveEngine;
//# sourceMappingURL=responsive-engine.d.ts.map