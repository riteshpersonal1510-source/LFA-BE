import { Browser, BrowserContext, Page } from 'playwright';
export interface BrowserManager {
    browser: Browser;
    context: BrowserContext;
    page: Page;
}
export declare class PlaywrightBrowser {
    private browser;
    private context;
    private page;
    initialize(): Promise<BrowserManager>;
    close(): Promise<void>;
    refreshPage(): Promise<Page>;
    getManaged(): {
        browser: Browser;
        context: BrowserContext;
        page: Page;
    };
}
//# sourceMappingURL=browser-manager.d.ts.map