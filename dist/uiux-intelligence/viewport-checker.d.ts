import { Page } from 'playwright';
import { ResponsiveAudit } from './types';
export declare class ViewportChecker {
    checkViewport(page: Page): Promise<Partial<ResponsiveAudit>>;
    checkResponsiveFrameworks(page: Page): Promise<boolean>;
    checkMediaQueries(page: Page): Promise<boolean>;
}
export declare const viewportChecker: ViewportChecker;
//# sourceMappingURL=viewport-checker.d.ts.map