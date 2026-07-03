import { PlaywrightBrowser } from '../browser/browser-manager';
export interface BrowserPoolOptions {
    maxBrowsers: number;
    headless: boolean;
}
export declare class BrowserPool {
    private browsers;
    private options;
    constructor(options: BrowserPoolOptions);
    initialize(): Promise<void>;
    acquire(sessionId: string): Promise<{
        browser: any;
        context: any;
        page: any;
    }>;
    release(sessionId: string): Promise<void>;
    restart(sessionId: string): Promise<void>;
    restartAll(): Promise<void>;
    closeAll(): Promise<void>;
    getActiveCount(): number;
    getBrowserCount(): number;
    getBrowser(sessionId: string): PlaywrightBrowser | undefined;
    hasSession(sessionId: string): boolean;
}
//# sourceMappingURL=browser-pool.d.ts.map