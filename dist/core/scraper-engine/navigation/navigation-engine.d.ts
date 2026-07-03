import { Page } from 'playwright';
import { NavigationInput } from './url-builder';
import { PageState } from './page-state-detector';
import { CascadeResult } from './fallback-cascade';
export type { NavigationInput };
export { PageState } from './page-state-detector';
export interface NavigationEngineResult {
    success: boolean;
    pageState: PageState;
    strategyUsed: number;
    query: string;
    url: string;
    businessCards: number;
    tld: string;
    countryName: string;
    failureReason: string | null;
    cascadeLogs: CascadeResult[];
}
export declare class NavigationEngine {
    private fallbackCascade;
    constructor();
    navigateToResults(page: Page, input: NavigationInput): Promise<NavigationEngineResult>;
    navigateToDetail(page: Page, url: string): Promise<boolean>;
    navigateToUrl(page: Page, url: string): Promise<boolean>;
    waitForCards(page: Page, minCards?: number): Promise<number>;
    waitForFeedStable(page: Page): Promise<boolean>;
    waitForMoreCards(page: Page, currentCount: number): Promise<number>;
    detectState(page: Page): Promise<PageState>;
    ensureSearchBox(page: Page, query: string): Promise<boolean>;
    handlePageState(page: Page): Promise<boolean>;
    private handleInterstitials;
    private detectFinalState;
}
//# sourceMappingURL=navigation-engine.d.ts.map