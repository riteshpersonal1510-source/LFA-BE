import { Page } from 'playwright';
import { logger } from '../../../utils/logger';
import { PageState, detectPageState, dismissConsent, dismissSignIn, handleCaptcha, getBusinessCardCount } from './page-state-detector';
import { waitForSearchBox, waitForNavigationComplete, waitForPageStable } from './wait-strategy';
import { buildSearchQuery, buildFallbackQueries, buildBaseMapsUrl, NavigationInput, BuiltQuery } from './url-builder';

export interface CascadeResult {
  success: boolean;
  strategyUsed: number;
  pageState: PageState;
  query: string;
  url: string;
  businessCards: number;
  failureReason: string | null;
}

interface CascadeLog {
  timestamp: string;
  country: string;
  keyword: string;
  generated_query: string;
  generated_url: string;
  detected_page_state: string;
  business_cards_found: number;
  retry_count: number;
  failure_reason: string | null;
}

function buildLog(input: NavigationInput, query: string, url: string, pageState: PageState, cards: number, retry: number, reason: string | null): CascadeLog {
  return {
    timestamp: new Date().toISOString(),
    country: input.country,
    keyword: input.keyword,
    generated_query: query,
    generated_url: url,
    detected_page_state: pageState,
    business_cards_found: cards,
    retry_count: retry,
    failure_reason: reason,
  };
}

export class FallbackCascade {
  private readonly MAX_RETRIES_PER_STRATEGY = 2;
  private readonly STRATEGY_COUNT = 5;

  async execute(page: Page, input: NavigationInput): Promise<CascadeResult> {
    const fallbackQueries = buildFallbackQueries(input);

    logger.info({
      country: input.country,
      keyword: input.keyword,
      area: input.area,
      city: input.city,
      state: input.state,
      initialStrategies: fallbackQueries.map(q => q.query),
    }, 'Navigation: Starting fallback cascade');

    for (let strategyIndex = 0; strategyIndex < this.STRATEGY_COUNT; strategyIndex++) {
      const strategy = strategyIndex + 1;

      const result = await this.tryStrategy(page, input, fallbackQueries, strategy);

      if (result) return result;
    }

    return {
      success: false,
      strategyUsed: 5,
      pageState: PageState.EMPTY_RESULTS,
      query: input.keyword,
      url: page.url(),
      businessCards: 0,
      failureReason: 'All 5 strategies exhausted',
    };
  }

  private async tryStrategy(page: Page, input: NavigationInput, _fallbackQueries: BuiltQuery[], strategy: number): Promise<CascadeResult | null> {
    for (let retry = 0; retry <= this.MAX_RETRIES_PER_STRATEGY; retry++) {
      const builtQuery = this.buildQueryForStrategy(input, strategy);
      if (!builtQuery) return null;

      const logEntry = buildLog(input, builtQuery.query, builtQuery.url, PageState.UNKNOWN, 0, retry, null);
      logger.info({ ...logEntry, strategy }, `Navigation: Strategy ${strategy} attempt ${retry + 1}`);

      try {
        const result = await this.executeStrategy(page, input, builtQuery, strategy, retry);

        logEntry.detected_page_state = result.pageState;
        logEntry.business_cards_found = result.businessCards;
        logEntry.failure_reason = result.failureReason;

        logger.info(logEntry, `Navigation: Strategy ${strategy} result`);

        if (result.success) return result;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        logEntry.failure_reason = msg;
        logger.error(logEntry, `Navigation: Strategy ${strategy} threw`);

        if (retry < this.MAX_RETRIES_PER_STRATEGY) {
          logger.info({ strategy, retry }, 'Navigation: Retrying strategy');
        }
      }
    }

    return null;
  }

  private buildQueryForStrategy(input: NavigationInput, strategy: number): BuiltQuery | null {
    switch (strategy) {
      case 1:
        return input.area ? buildSearchQuery(input, 1) : null;
      case 2:
        return input.state ? buildSearchQuery(input, 2) : null;
      case 3:
        return buildSearchQuery(input, 3);
      case 4:
        return buildSearchQuery(input, 4);
      case 5:
        return null;
      default:
        return null;
    }
  }

  private async executeStrategy(
    page: Page,
    input: NavigationInput,
    builtQuery: BuiltQuery | null,
    strategy: number,
    retry: number,
  ): Promise<CascadeResult> {
    if (strategy === 5) {
      return this.executeStrategy5(page, input, retry);
    }

    if (!builtQuery) {
      return {
        success: false,
        strategyUsed: strategy,
        pageState: PageState.UNKNOWN,
        query: '',
        url: page.url(),
        businessCards: 0,
        failureReason: 'No query built for strategy',
      };
    }

    await page.goto(builtQuery.url, {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    });

    await waitForNavigationComplete(page, undefined, 10000);

    await this.handleInterstitials(page);

    await waitForPageStable(page, 3000);

    const pageState = await detectPageState(page);

    if (pageState.state === PageState.RESULTS_LIST) {
      const cards = await getBusinessCardCount(page);

      if (cards > 0) {
        return {
          success: true,
          strategyUsed: strategy,
          pageState: PageState.RESULTS_LIST,
          query: builtQuery.query,
          url: builtQuery.url,
          businessCards: cards,
          failureReason: null,
        };
      }

      return {
        success: false,
        strategyUsed: strategy,
        pageState: PageState.EMPTY_RESULTS,
        query: builtQuery.query,
        url: builtQuery.url,
        businessCards: 0,
        failureReason: 'Feed found but 0 cards',
      };
    }

    if (pageState.state === PageState.SEARCH_PAGE) {
      return this.executeSearchBoxFallback(page, input.keyword, input.city);
    }

    if (pageState.state === PageState.BUSINESS_DETAIL) {
      return {
        success: true,
        strategyUsed: strategy,
        pageState: PageState.BUSINESS_DETAIL,
        query: builtQuery.query,
        url: builtQuery.url,
        businessCards: 1,
        failureReason: null,
      };
    }

    return {
      success: false,
      strategyUsed: strategy,
      pageState: pageState.state,
      query: builtQuery.query,
      url: builtQuery.url,
      businessCards: 0,
      failureReason: `Page state: ${pageState.state}`,
    };
  }

  private async executeStrategy5(page: Page, input: NavigationInput, _retry: number): Promise<CascadeResult> {
    const baseUrl = buildBaseMapsUrl(input.country);

    await page.goto(baseUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    });

    await waitForNavigationComplete(page, undefined, 10000);
    await this.handleInterstitials(page);

    return this.executeSearchBoxFallback(page, input.keyword, input.city);
  }

  private async executeSearchBoxFallback(page: Page, keyword: string, city: string): Promise<CascadeResult> {
    const searchQuery = `${keyword} ${city}`;

    const searchBoxVisible = await waitForSearchBox(page, 5000);

    if (searchBoxVisible) {
      const selectors = ['#searchboxinput', 'input[name="q"]', 'input[aria-label*="Search"]', 'input[placeholder*="Search"]'];

      for (const selector of selectors) {
        try {
          await page.click(selector, { timeout: 2000 });
          await page.fill(selector, searchQuery);
          await page.keyboard.press('Enter');
          break;
        } catch {
          continue;
        }
      }

      await waitForNavigationComplete(page, undefined, 10000);

      const pageState = await detectPageState(page);

      if (pageState.state === PageState.RESULTS_LIST) {
        const cards = await getBusinessCardCount(page);
        return {
          success: cards > 0,
          strategyUsed: 5,
          pageState: PageState.RESULTS_LIST,
          query: searchQuery,
          url: page.url(),
          businessCards: cards,
          failureReason: cards > 0 ? null : 'Search box typed but 0 cards',
        };
      }

      return {
        success: false,
        strategyUsed: 5,
        pageState: pageState.state,
        query: searchQuery,
        url: page.url(),
        businessCards: 0,
        failureReason: `Strategy 5 landed on ${pageState.state}`,
      };
    }

    return {
      success: false,
      strategyUsed: 5,
      pageState: PageState.UNKNOWN,
      query: searchQuery,
      url: page.url(),
      businessCards: 0,
      failureReason: 'Search box not found',
    };
  }

  private async handleInterstitials(page: Page): Promise<void> {
    await dismissConsent(page);
    await dismissSignIn(page);

    const captchaResult = await handleCaptcha(page);
    if (captchaResult === 'waiting') {
      logger.error({}, 'Navigation: CAPTCHA requires manual resolution');
    }
  }
}
