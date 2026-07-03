import { Page } from 'playwright';
import { ViewportConfig } from './types';
export declare class ScreenshotEngine {
    private screenshotDir;
    private dirEnsured;
    constructor();
    private ensureScreenshotDir;
    ensureReady(): Promise<void>;
    captureScreenshot(page: Page, viewport: ViewportConfig, url: string, quality?: number): Promise<string | null>;
    captureBase64Screenshot(page: Page, viewport: ViewportConfig, quality?: number): Promise<string | null>;
    private sanitizeUrl;
    cleanupOldScreenshots(daysOld?: number): Promise<void>;
}
export declare const screenshotEngine: ScreenshotEngine;
//# sourceMappingURL=screenshot-engine.d.ts.map