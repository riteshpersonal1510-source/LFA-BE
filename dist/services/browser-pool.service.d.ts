import { Browser, Page, BrowserContext } from 'playwright';
export declare class BrowserPool {
    private pool;
    private maxSize;
    private cleanupTimer;
    constructor(maxSize?: number);
    acquire(sourceName: string): Promise<{
        page: Page;
        browser: Browser;
        context: BrowserContext;
    }>;
    release(page: Page, sourceName: string): Promise<void>;
    shutdown(): Promise<void>;
    reset(): Promise<void>;
    getStatus(): {
        poolSize: number;
        activeBrowsers: number;
        idleBrowsers: number;
    };
    private findIdleBrowser;
    private launchNewBrowser;
    private setupPageAborts;
    private destroyBrowser;
    private startCleanupTimer;
}
export declare const browserPool: BrowserPool;
//# sourceMappingURL=browser-pool.service.d.ts.map