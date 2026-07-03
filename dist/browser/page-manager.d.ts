import { Page } from 'playwright';
export interface PageManagerOptions {
    defaultTimeout: number;
    navigationTimeout: number;
    extractionTimeout: number;
}
export declare class PageManager {
    private page;
    private options;
    constructor(page: Page, options?: Partial<PageManagerOptions>);
    navigate(url: string): Promise<void>;
    click(selector: string, options?: {
        timeout?: number;
    }): Promise<void>;
    waitForSelector(selector: string, options?: {
        timeout?: number;
    }): Promise<void>;
    scrollToBottom(): Promise<void>;
    getText(selector: string): Promise<string | null>;
    getAttribute(selector: string, attribute: string): Promise<string | null>;
    count(selector: string): Promise<number>;
    waitForNetworkIdle(): Promise<void>;
    clearCache(): Promise<void>;
    getMetrics(): {
        url: string;
        width: number;
        height: number;
    };
}
//# sourceMappingURL=page-manager.d.ts.map