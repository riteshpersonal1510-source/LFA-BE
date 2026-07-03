"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FallbackCascade = void 0;
const logger_1 = require("../../../utils/logger");
const page_state_detector_1 = require("./page-state-detector");
const wait_strategy_1 = require("./wait-strategy");
const url_builder_1 = require("./url-builder");
function buildLog(input, query, url, pageState, cards, retry, reason) {
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
class FallbackCascade {
    constructor() {
        this.MAX_RETRIES_PER_STRATEGY = 2;
        this.STRATEGY_COUNT = 5;
    }
    async execute(page, input) {
        const fallbackQueries = (0, url_builder_1.buildFallbackQueries)(input);
        logger_1.logger.info({
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
            if (result)
                return result;
        }
        return {
            success: false,
            strategyUsed: 5,
            pageState: page_state_detector_1.PageState.EMPTY_RESULTS,
            query: input.keyword,
            url: page.url(),
            businessCards: 0,
            failureReason: 'All 5 strategies exhausted',
        };
    }
    async tryStrategy(page, input, _fallbackQueries, strategy) {
        for (let retry = 0; retry <= this.MAX_RETRIES_PER_STRATEGY; retry++) {
            const builtQuery = this.buildQueryForStrategy(input, strategy);
            if (!builtQuery)
                return null;
            const logEntry = buildLog(input, builtQuery.query, builtQuery.url, page_state_detector_1.PageState.UNKNOWN, 0, retry, null);
            logger_1.logger.info({ ...logEntry, strategy }, `Navigation: Strategy ${strategy} attempt ${retry + 1}`);
            try {
                const result = await this.executeStrategy(page, input, builtQuery, strategy, retry);
                logEntry.detected_page_state = result.pageState;
                logEntry.business_cards_found = result.businessCards;
                logEntry.failure_reason = result.failureReason;
                logger_1.logger.info(logEntry, `Navigation: Strategy ${strategy} result`);
                if (result.success)
                    return result;
            }
            catch (error) {
                const msg = error instanceof Error ? error.message : 'Unknown error';
                logEntry.failure_reason = msg;
                logger_1.logger.error(logEntry, `Navigation: Strategy ${strategy} threw`);
                if (retry < this.MAX_RETRIES_PER_STRATEGY) {
                    logger_1.logger.info({ strategy, retry }, 'Navigation: Retrying strategy');
                }
            }
        }
        return null;
    }
    buildQueryForStrategy(input, strategy) {
        switch (strategy) {
            case 1:
                return input.area ? (0, url_builder_1.buildSearchQuery)(input, 1) : null;
            case 2:
                return input.state ? (0, url_builder_1.buildSearchQuery)(input, 2) : null;
            case 3:
                return (0, url_builder_1.buildSearchQuery)(input, 3);
            case 4:
                return (0, url_builder_1.buildSearchQuery)(input, 4);
            case 5:
                return null;
            default:
                return null;
        }
    }
    async executeStrategy(page, input, builtQuery, strategy, retry) {
        if (strategy === 5) {
            return this.executeStrategy5(page, input, retry);
        }
        if (!builtQuery) {
            return {
                success: false,
                strategyUsed: strategy,
                pageState: page_state_detector_1.PageState.UNKNOWN,
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
        await (0, wait_strategy_1.waitForNavigationComplete)(page, undefined, 10000);
        await this.handleInterstitials(page);
        await (0, wait_strategy_1.waitForPageStable)(page, 3000);
        const pageState = await (0, page_state_detector_1.detectPageState)(page);
        if (pageState.state === page_state_detector_1.PageState.RESULTS_LIST) {
            const cards = await (0, page_state_detector_1.getBusinessCardCount)(page);
            if (cards > 0) {
                return {
                    success: true,
                    strategyUsed: strategy,
                    pageState: page_state_detector_1.PageState.RESULTS_LIST,
                    query: builtQuery.query,
                    url: builtQuery.url,
                    businessCards: cards,
                    failureReason: null,
                };
            }
            return {
                success: false,
                strategyUsed: strategy,
                pageState: page_state_detector_1.PageState.EMPTY_RESULTS,
                query: builtQuery.query,
                url: builtQuery.url,
                businessCards: 0,
                failureReason: 'Feed found but 0 cards',
            };
        }
        if (pageState.state === page_state_detector_1.PageState.SEARCH_PAGE) {
            return this.executeSearchBoxFallback(page, input.keyword, input.city);
        }
        if (pageState.state === page_state_detector_1.PageState.BUSINESS_DETAIL) {
            return {
                success: true,
                strategyUsed: strategy,
                pageState: page_state_detector_1.PageState.BUSINESS_DETAIL,
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
    async executeStrategy5(page, input, _retry) {
        const baseUrl = (0, url_builder_1.buildBaseMapsUrl)(input.country);
        await page.goto(baseUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 20000,
        });
        await (0, wait_strategy_1.waitForNavigationComplete)(page, undefined, 10000);
        await this.handleInterstitials(page);
        return this.executeSearchBoxFallback(page, input.keyword, input.city);
    }
    async executeSearchBoxFallback(page, keyword, city) {
        const searchQuery = `${keyword} ${city}`;
        const searchBoxVisible = await (0, wait_strategy_1.waitForSearchBox)(page, 5000);
        if (searchBoxVisible) {
            const selectors = ['#searchboxinput', 'input[name="q"]', 'input[aria-label*="Search"]', 'input[placeholder*="Search"]'];
            for (const selector of selectors) {
                try {
                    await page.click(selector, { timeout: 2000 });
                    await page.fill(selector, searchQuery);
                    await page.keyboard.press('Enter');
                    break;
                }
                catch {
                    continue;
                }
            }
            await (0, wait_strategy_1.waitForNavigationComplete)(page, undefined, 10000);
            const pageState = await (0, page_state_detector_1.detectPageState)(page);
            if (pageState.state === page_state_detector_1.PageState.RESULTS_LIST) {
                const cards = await (0, page_state_detector_1.getBusinessCardCount)(page);
                return {
                    success: cards > 0,
                    strategyUsed: 5,
                    pageState: page_state_detector_1.PageState.RESULTS_LIST,
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
            pageState: page_state_detector_1.PageState.UNKNOWN,
            query: searchQuery,
            url: page.url(),
            businessCards: 0,
            failureReason: 'Search box not found',
        };
    }
    async handleInterstitials(page) {
        await (0, page_state_detector_1.dismissConsent)(page);
        await (0, page_state_detector_1.dismissSignIn)(page);
        const captchaResult = await (0, page_state_detector_1.handleCaptcha)(page);
        if (captchaResult === 'waiting') {
            logger_1.logger.error({}, 'Navigation: CAPTCHA requires manual resolution');
        }
    }
}
exports.FallbackCascade = FallbackCascade;
//# sourceMappingURL=fallback-cascade.js.map