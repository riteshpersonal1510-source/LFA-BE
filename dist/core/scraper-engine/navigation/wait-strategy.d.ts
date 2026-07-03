import { Page } from 'playwright';
export declare function waitForResultsFeed(page: Page, timeoutMs?: number): Promise<boolean>;
export declare function waitForBusinessCards(page: Page, minCards?: number, timeoutMs?: number): Promise<number>;
export declare function waitForSearchBox(page: Page, timeoutMs?: number): Promise<boolean>;
export declare function waitForPageStable(page: Page, timeoutMs?: number): Promise<void>;
export declare function waitForDetailPanel(page: Page, timeoutMs?: number): Promise<boolean>;
export declare function waitForNavigationComplete(page: Page, url?: string, timeoutMs?: number): Promise<boolean>;
export declare function waitForContentStable(page: Page, selector: string, timeoutMs?: number): Promise<boolean>;
export declare function waitForListUpdate(page: Page, currentCount: number, timeoutMs?: number): Promise<number>;
//# sourceMappingURL=wait-strategy.d.ts.map