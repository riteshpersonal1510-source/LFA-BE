import { WebsiteFreshness } from './types';
export declare class FreshnessDetector {
    detectFreshness(html: string, copyrightYear: number | null): Promise<WebsiteFreshness>;
    private detectDesignGeneration;
    private checkModernStandards;
    private detectModernCSS;
    private detectResponsiveFramework;
    private getDefaultFreshness;
}
export declare const freshnessDetector: FreshnessDetector;
//# sourceMappingURL=freshness-detector.d.ts.map