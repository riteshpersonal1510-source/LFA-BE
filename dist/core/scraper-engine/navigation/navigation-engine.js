"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NavigationEngine = exports.PageState = void 0;
const logger_1 = require("../../../utils/logger");
const url_builder_1 = require("./url-builder");
const page_state_detector_1 = require("./page-state-detector");
const fallback_cascade_1 = require("./fallback-cascade");
const wait_strategy_1 = require("./wait-strategy");
var page_state_detector_2 = require("./page-state-detector");
Object.defineProperty(exports, "PageState", { enumerable: true, get: function () { return page_state_detector_2.PageState; } });
class NavigationEngine {
    constructor() {
        this.fallbackCascade = new fallback_cascade_1.FallbackCascade();
    }
    async navigateToResults(page, input) {
        const tld = (0, url_builder_1.getTld)(input.country);
        const countryName = (0, url_builder_1.getCountryName)(input.country);
        logger_1.logger.info({
            keyword: input.keyword,
            area: input.area,
            city: input.city,
            state: input.state,
            country: input.country,
            tld,
            countryName,
        }, 'NavigationEngine: Starting navigation');
        const initialQuery = (0, url_builder_1.buildSearchQuery)(input, 3);
        logger_1.logger.info({ url: initialQuery.url, query: initialQuery.query }, 'NavigationEngine: Initial query');
        await this.handleInterstitials(page);
        const cascadeResult = await this.fallbackCascade.execute(page, input);
        const finalPageState = cascadeResult.success
            ? await this.detectFinalState(page)
            : cascadeResult.pageState;
        const result = {
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
        logger_1.logger.info({
            success: result.success,
            strategy: result.strategyUsed,
            state: result.pageState,
            cards: result.businessCards,
            query: result.query,
        }, 'NavigationEngine: Navigation complete');
        return result;
    }
    async navigateToDetail(page, url) {
        try {
            await page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: 20000,
            });
            await this.handleInterstitials(page);
            const detailReady = await (0, wait_strategy_1.waitForDetailPanel)(page, 10000);
            if (!detailReady) {
                await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => { });
                return await (0, wait_strategy_1.waitForDetailPanel)(page, 5000);
            }
            return true;
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown';
            logger_1.logger.error({ err: msg, url }, 'NavigationEngine: navigateToDetail failed');
            return false;
        }
    }
    async navigateToUrl(page, url) {
        try {
            await page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: 20000,
            });
            await (0, wait_strategy_1.waitForNavigationComplete)(page, undefined, 10000);
            await this.handleInterstitials(page);
            const state = await (0, page_state_detector_1.detectPageState)(page);
            return state.state !== page_state_detector_1.PageState.ERROR_PAGE && state.state !== page_state_detector_1.PageState.UNKNOWN;
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown';
            logger_1.logger.error({ err: msg, url }, 'NavigationEngine: navigateToUrl failed');
            return false;
        }
    }
    async waitForCards(page, minCards = 1) {
        return (0, wait_strategy_1.waitForBusinessCards)(page, minCards);
    }
    async waitForFeedStable(page) {
        const feedExists = await (0, wait_strategy_1.waitForResultsFeed)(page, 5000);
        if (feedExists) {
            await (0, wait_strategy_1.waitForContentStable)(page, '[role="feed"]', 5000);
        }
        return feedExists;
    }
    async waitForMoreCards(page, currentCount) {
        return (0, wait_strategy_1.waitForListUpdate)(page, currentCount);
    }
    async detectState(page) {
        const result = await (0, page_state_detector_1.detectPageState)(page);
        return result.state;
    }
    async ensureSearchBox(page, query) {
        const visible = await (0, wait_strategy_1.waitForSearchBox)(page, 5000);
        if (!visible)
            return false;
        const selectors = ['#searchboxinput', 'input[name="q"]', 'input[aria-label*="Search"]', 'input[placeholder*="Search"]'];
        for (const selector of selectors) {
            try {
                await page.click(selector, { timeout: 2000 });
                await page.fill(selector, query);
                await page.keyboard.press('Enter');
                await (0, wait_strategy_1.waitForNavigationComplete)(page, undefined, 10000);
                return true;
            }
            catch {
                continue;
            }
        }
        return false;
    }
    async handlePageState(page) {
        const state = await (0, page_state_detector_1.detectPageState)(page);
        switch (state.state) {
            case page_state_detector_1.PageState.COOKIE_CONSENT:
                return (0, page_state_detector_1.dismissConsent)(page);
            case page_state_detector_1.PageState.SIGN_IN:
                return (0, page_state_detector_1.dismissSignIn)(page);
            case page_state_detector_1.PageState.CAPTCHA:
                await (0, page_state_detector_1.handleCaptcha)(page);
                return false;
            case page_state_detector_1.PageState.RATE_LIMITED:
                logger_1.logger.error({ url: page.url() }, 'Navigation: Rate limited');
                return false;
            default:
                return true;
        }
    }
    async handleInterstitials(page) {
        await (0, page_state_detector_1.dismissConsent)(page);
        await (0, page_state_detector_1.dismissSignIn)(page);
        const captchaResult = await (0, page_state_detector_1.handleCaptcha)(page);
        if (captchaResult === 'waiting') {
            logger_1.logger.error({}, 'NavigationEngine: CAPTCHA requires manual resolution');
        }
    }
    async detectFinalState(page) {
        const result = await (0, page_state_detector_1.detectPageState)(page);
        return result.state;
    }
}
exports.NavigationEngine = NavigationEngine;
//# sourceMappingURL=navigation-engine.js.map