import { Page } from 'playwright';
import { logger } from '../../../utils/logger';
import { NavigationInput, buildSearchQuery, getTld, getCountryName } from './url-builder';
import { PageState, detectPageState, dismissConsent, dismissSignIn, handleCaptcha } from './page-state-detector';
import { FallbackCascade, CascadeResult } from './fallback-cascade';
import {
  waitForResultsFeed,
  waitForBusinessCards,
  waitForSearchBox,
  waitForDetailPanel,
  waitForNavigationComplete,
  waitForContentStable,
  waitForListUpdate,
} from './wait-strategy';

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

export class NavigationEngine {
  private fallbackCascade: FallbackCascade;

  constructor() {
    this.fallbackCascade = new FallbackCascade();
  }

  async navigateToResults(page: Page, input: NavigationInput): Promise<NavigationEngineResult> {
    const tld = getTld(input.country);
    const countryName = getCountryName(input.country);

    logger.info({
      keyword: input.keyword,
      area: input.area,
      city: input.city,
      state: input.state,
      country: input.country,
      tld,
      countryName,
    }, 'NavigationEngine: Starting navigation');

    const initialQuery = buildSearchQuery(input, 3);
    logger.info({ url: initialQuery.url, query: initialQuery.query }, 'NavigationEngine: Initial query');

    await this.handleInterstitials(page);

    const cascadeResult = await this.fallbackCascade.execute(page, input);

    const finalPageState = cascadeResult.success
      ? await this.detectFinalState(page)
      : cascadeResult.pageState;

    const result: NavigationEngineResult = {
      success: cascadeResult.success,
      pageState: finalPageState,
      strategyUsed: cascadeResult.strategyUsed,
      query: cascadeResult.query,
      url: cascadeResult.url || page.url(),
      businessCards: cascadeResult.businessCards,
      tld,
      countryName,
      failureReason: cascadeResult.failureReason,
      cascadeLogs: [cascadeResult],
    };

    logger.info({
      success: result.success,
      strategy: result.strategyUsed,
      state: result.pageState,
      cards: result.businessCards,
      query: result.query,
    }, 'NavigationEngine: Navigation complete');

    return result;
  }

  async navigateToDetail(page: Page, url: string): Promise<boolean> {
    try {
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 20000,
      });

      await this.handleInterstitials(page);

      const detailReady = await waitForDetailPanel(page, 10000);

      if (!detailReady) {
        await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
        return await waitForDetailPanel(page, 5000);
      }

      return true;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown';
      logger.error({ err: msg, url }, 'NavigationEngine: navigateToDetail failed');
      return false;
    }
  }

  async navigateToUrl(page: Page, url: string): Promise<boolean> {
    try {
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 20000,
      });

      await waitForNavigationComplete(page, undefined, 10000);
      await this.handleInterstitials(page);

      const state = await detectPageState(page);
      return state.state !== PageState.ERROR_PAGE && state.state !== PageState.UNKNOWN;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown';
      logger.error({ err: msg, url }, 'NavigationEngine: navigateToUrl failed');
      return false;
    }
  }

  async waitForCards(page: Page, minCards: number = 1): Promise<number> {
    return waitForBusinessCards(page, minCards);
  }

  async waitForFeedStable(page: Page): Promise<boolean> {
    const feedExists = await waitForResultsFeed(page, 5000);
    if (feedExists) {
      await waitForContentStable(page, '[role="feed"]', 5000);
    }
    return feedExists;
  }

  async waitForMoreCards(page: Page, currentCount: number): Promise<number> {
    return waitForListUpdate(page, currentCount);
  }

  async detectState(page: Page): Promise<PageState> {
    const result = await detectPageState(page);
    return result.state;
  }

  async ensureSearchBox(page: Page, query: string): Promise<boolean> {
    const visible = await waitForSearchBox(page, 5000);
    if (!visible) return false;

    const selectors = ['#searchboxinput', 'input[name="q"]', 'input[aria-label*="Search"]', 'input[placeholder*="Search"]'];

    for (const selector of selectors) {
      try {
        await page.click(selector, { timeout: 2000 });
        await page.fill(selector, query);
        await page.keyboard.press('Enter');
        await waitForNavigationComplete(page, undefined, 10000);
        return true;
      } catch {
        continue;
      }
    }

    return false;
  }

  async handlePageState(page: Page): Promise<boolean> {
    const state = await detectPageState(page);

    switch (state.state) {
      case PageState.COOKIE_CONSENT:
        return dismissConsent(page);
      case PageState.SIGN_IN:
        return dismissSignIn(page);
      case PageState.CAPTCHA:
        await handleCaptcha(page);
        return false;
      case PageState.RATE_LIMITED:
        logger.error({ url: page.url() }, 'Navigation: Rate limited');
        return false;
      default:
        return true;
    }
  }

  private async handleInterstitials(page: Page): Promise<void> {
    await dismissConsent(page);
    await dismissSignIn(page);

    const captchaResult = await handleCaptcha(page);
    if (captchaResult === 'waiting') {
      logger.error({}, 'NavigationEngine: CAPTCHA requires manual resolution');
    }
  }

  private async detectFinalState(page: Page): Promise<PageState> {
    const result = await detectPageState(page);
    return result.state;
  }
}
