import { Page } from 'playwright';
import { UIUXAuditResult } from './types';
export declare class UIUXAnalyzer {
    analyzeUIUX(page: Page, isMobile: boolean): Promise<UIUXAuditResult>;
    private hasCroppedSections;
    private hasLayoutBreak;
}
export declare const uiuxAnalyzer: UIUXAnalyzer;
//# sourceMappingURL=uiux-analyzer.d.ts.map