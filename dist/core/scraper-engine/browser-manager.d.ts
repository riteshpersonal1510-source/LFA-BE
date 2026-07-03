import { Browser, BrowserContext, Page } from 'playwright';
interface PageDiagnostics {
    console: string[];
    requests: Array<{
        url: string;
        method: string;
        status?: number;
        resourceType: string;
    }>;
}
export declare class BrowserManager {
    private browser;
    private contexts;
    private pageOwner;
    private pageDiagnostics;
    private cleanupTimer;
    private totalPagesCreated;
    private totalPagesClosed;
    private browserCrashes;
    private userAgentIndex;
    private launchAttempts;
    private maxLaunchAttempts;
    private lastLaunchAttemptTime;
    private backoffResetWindowMs;
    private lockQueue;
    private locked;
    constructor();
    private lock;
    private unlock;
    acquire(sourceName: string, _browserType?: string): Promise<{
        page: Page;
        browser: Browser;
        context: BrowserContext;
    }>;
    acquireForCountry(sourceName: string, country: string): Promise<{
        page: Page;
        browser: Browser;
        context: BrowserContext;
    }>;
    acquireMultiple(sourceName: string, count: number, country?: string): Promise<{
        page: Page;
        browser: Browser;
        context: BrowserContext;
    }[]>;
    acquireFresh(sourceName: string): Promise<{
        page: Page;
        browser: Browser;
        context: BrowserContext;
    }>;
    release(page: Page, _sourceName: string): Promise<void>;
    releaseAll(pages: Page[], sourceName: string): Promise<void>;
    releaseAllActive(): Promise<void>;
    shutdown(): Promise<void>;
    reset(): Promise<void>;
    getStatus(): {
        browserAlive: boolean;
        contexts: number;
        activePages: number;
        totalPagesCreated: number;
        totalPagesClosed: number;
        browserCrashes: number;
        memoryUsageMB: number;
    };
    private ensureBrowserLocked;
    private launchBrowserLocked;
    private findOrCreateContextLocked;
    private createContextLocked;
    private setupPage;
    getPageDiagnostics(page: Page): PageDiagnostics | undefined;
    private startCleanupTimer;
}
export declare const browserManager: BrowserManager;
export {};
//# sourceMappingURL=browser-manager.d.ts.map