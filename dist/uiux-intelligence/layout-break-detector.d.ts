import { Page } from 'playwright';
import { LayoutMetrics } from './types';
export declare class LayoutBreakDetector {
    analyzeLayout(page: Page): Promise<LayoutMetrics>;
    detectHorizontalScroll(page: Page): Promise<boolean>;
    detectOverflow(page: Page): Promise<boolean>;
    detectOffscreenElements(page: Page): Promise<number>;
}
export declare const layoutBreakDetector: LayoutBreakDetector;
//# sourceMappingURL=layout-break-detector.d.ts.map