import { Page } from 'playwright';
import { PageState } from './page-state-detector';
import { NavigationInput } from './url-builder';
export interface CascadeResult {
    success: boolean;
    strategyUsed: number;
    pageState: PageState;
    query: string;
    url: string;
    businessCards: number;
    failureReason: string | null;
}
export declare class FallbackCascade {
    private readonly MAX_RETRIES_PER_STRATEGY;
    private readonly STRATEGY_COUNT;
    execute(page: Page, input: NavigationInput): Promise<CascadeResult>;
    private tryStrategy;
    private buildQueryForStrategy;
    private executeStrategy;
    private executeStrategy5;
    private executeSearchBoxFallback;
    private handleInterstitials;
}
//# sourceMappingURL=fallback-cascade.d.ts.map