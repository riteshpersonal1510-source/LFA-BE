"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageState = void 0;
exports.detectPageState = detectPageState;
exports.dismissConsent = dismissConsent;
exports.handleCaptcha = handleCaptcha;
exports.dismissSignIn = dismissSignIn;
exports.getBusinessCardCount = getBusinessCardCount;
const logger_1 = require("../../../utils/logger");
var PageState;
(function (PageState) {
    PageState["COOKIE_CONSENT"] = "COOKIE_CONSENT";
    PageState["SIGN_IN"] = "SIGN_IN";
    PageState["CAPTCHA"] = "CAPTCHA";
    PageState["SEARCH_PAGE"] = "SEARCH_PAGE";
    PageState["RESULTS_LIST"] = "RESULTS_LIST";
    PageState["BUSINESS_DETAIL"] = "BUSINESS_DETAIL";
    PageState["EMPTY_RESULTS"] = "EMPTY_RESULTS";
    PageState["ERROR_PAGE"] = "ERROR_PAGE";
    PageState["RATE_LIMITED"] = "RATE_LIMITED";
    PageState["UNKNOWN"] = "UNKNOWN";
})(PageState || (exports.PageState = PageState = {}));
function makeDetector(state, urlPattern, textPatterns, selectors, timeoutMs = 3000) {
    return async (page) => {
        try {
            const currentUrl = page.url().toLowerCase();
            if (urlPattern.test(currentUrl)) {
                return { state, confidence: 0.95, evidence: `URL matched: ${urlPattern}` };
            }
            const pageText = await page.evaluate(() => document.body?.innerText?.toLowerCase() || '').catch(() => '');
            for (const pattern of textPatterns) {
                if (pageText.includes(pattern.toLowerCase())) {
                    return { state, confidence: 0.85, evidence: `Text matched: "${pattern}"` };
                }
            }
            for (const selector of selectors) {
                const visible = await page.isVisible(selector, { timeout: timeoutMs }).catch(() => false);
                if (visible) {
                    return { state, confidence: 0.9, evidence: `Selector matched: ${selector}` };
                }
            }
        }
        catch {
            return null;
        }
        return null;
    };
}
function createDetectors(page) {
    return [
        makeDetector(PageState.COOKIE_CONSENT, /consent\.google\./, ['accept all', 'accept cookies', 'agree', 'i agree', 'accept all cookies', 'got it'], [
            'button:has-text("Accept all")',
            'button:has-text("Accept")',
            'button:has-text("Agree")',
            'button:has-text("Got it")',
            '[aria-label*="Accept"]',
            '[aria-label*="consent"]',
            'form[action*="consent"] button',
            '#consent-form button',
            '.consent button',
            'button:has-text("Alle akzeptieren")',
            'button:has-text("Tout accepter")',
            'button:has-text("Alle annehmen")',
            'button:has-text("同意する")',
            'button:has-text("Accept all cookies")',
            'button:has-text("I agree")',
            'div[role="dialog"] button:has-text("Accept")',
        ], 2000)(page),
        makeDetector(PageState.SIGN_IN, /accounts\.google\.com/, ['sign in', 'sign-in', 'signin', 'create account', 'use another account'], [
            '#identifierId',
            'input[type="email"]',
            'input[name="identifier"]',
            '[aria-label*="Email"]',
            '[aria-label*="Phone"]',
            'div[role="dialog"]:has-text("Sign in")',
        ], 2000)(page),
        makeDetector(PageState.CAPTCHA, /google\.com\/sorry/, ['unusual traffic', 'captcha', 'are you a robot', 'verify you are human', 'not a robot', 'recaptcha'], [
            '#captcha-form',
            'iframe[src*="recaptcha"]',
            'div.recaptcha',
            '#recaptcha',
            '[aria-label*="captcha"]',
            'img[src*="captcha"]',
        ], 2000)(page),
        makeDetector(PageState.RATE_LIMITED, /google\.com\/sorry/, ['unusual traffic', 'rate limit', 'too many requests', 'try again later', 'automated queries'], [], 2000)(page),
        makeDetector(PageState.RESULTS_LIST, /\/maps\/search\//, [], [
            '[role="feed"]',
            '[role="feed"] > *',
            'div[role="list"]',
            'a[href*="maps/place/"]',
            'div.section-listbox',
        ], 3000)(page),
        makeDetector(PageState.BUSINESS_DETAIL, /\/maps\/place\//, [], [
            '[role="main"] h1',
            'button[data-item-id*="address"]',
            'div[role="main"] button[aria-label*="address"]',
            'div.lMbq3e',
            'div.TIHn2',
            'div[class*="business"]',
        ], 2000)(page),
        makeDetector(PageState.EMPTY_RESULTS, /\/maps\/search\//, ['no results', 'did not match', 'no listings', '0 results', 'try adjusting your filters', 'no places found', 'keine Ergebnisse', 'aucun résultat', '見つかりません'], [
            'div:has-text("No results")',
            'div:has-text("no results")',
            'span:has-text("0 results")',
        ], 2000)(page),
        makeDetector(PageState.ERROR_PAGE, /\/maps\/.*error/, ['error', 'something went wrong', 'page not found', '404', '500', 'service unavailable', 'not found'], [
            'div[role="alert"]',
            '.error-page',
            '#error',
        ], 2000)(page),
    ];
}
async function detectPageState(page) {
    const detectors = createDetectors(page);
    const results = await Promise.allSettled(detectors);
    const detected = [];
    for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
            detected.push(result.value);
        }
    }
    if (detected.length === 0) {
        const url = page.url().toLowerCase();
        if (url.includes('/maps') && !url.includes('/maps/search') && !url.includes('/maps/place')) {
            return { state: PageState.SEARCH_PAGE, confidence: 0.7, evidence: 'Maps base page' };
        }
        return { state: PageState.UNKNOWN, confidence: 0.3, evidence: 'No detectors matched' };
    }
    detected.sort((a, b) => b.confidence - a.confidence);
    return detected[0];
}
async function dismissConsent(page) {
    const consentSelectors = [
        'button:has-text("Accept all")',
        'button:has-text("Accept")',
        'button:has-text("Agree")',
        'button:has-text("Got it")',
        'button:has-text("I agree")',
        '[aria-label*="Accept"]',
        'form[action*="consent"] button',
        '#consent-form button',
        '.consent button',
        'button:has-text("Alle akzeptieren")',
        'button:has-text("Tout accepter")',
        'button:has-text("同意する")',
        'button:has-text("Accept all cookies")',
        'div[role="dialog"] button:has-text("Accept")',
        'button:has-text("Yes, I\'m in")',
        'button:has-text("Sign in")',
        'button:has-text("No thanks")',
        'button:has-text("Skip")',
        'button:has-text("Stay signed out")',
    ];
    for (const selector of consentSelectors) {
        try {
            const visible = await page.isVisible(selector, { timeout: 500 }).catch(() => false);
            if (visible) {
                await page.click(selector, { timeout: 1000 });
                await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => { });
                logger_1.logger.info({ selector }, 'Navigation: Consent dismissed');
                return true;
            }
        }
        catch {
            continue;
        }
    }
    return false;
}
async function handleCaptcha(page) {
    const isCaptcha = await page.isVisible('iframe[src*="recaptcha"], #captcha-form, div.recaptcha', { timeout: 1000 }).catch(() => false);
    if (!isCaptcha)
        return 'not_found';
    logger_1.logger.error({ url: page.url() }, 'Navigation: CAPTCHA detected — pausing for manual resolution');
    return 'waiting';
}
async function dismissSignIn(page) {
    const dismissSelectors = [
        'button:has-text("No thanks")',
        'button:has-text("Not now")',
        'button:has-text("Skip")',
        'button:has-text("Stay signed out")',
        'button:has-text("Continue without signing in")',
        '[aria-label*="Close"]',
        'button[aria-label*="dismiss"]',
        'div[role="dialog"] button:has-text("No")',
        'div[role="dialog"] [aria-label*="Close"]',
    ];
    for (const selector of dismissSelectors) {
        try {
            const visible = await page.isVisible(selector, { timeout: 500 }).catch(() => false);
            if (visible) {
                await page.click(selector, { timeout: 1000 });
                await page.waitForTimeout(500);
                logger_1.logger.info({ selector }, 'Navigation: Sign-in dismissed');
                return true;
            }
        }
        catch {
            continue;
        }
    }
    return false;
}
async function getBusinessCardCount(page) {
    try {
        const count = await page.evaluate(() => {
            const feed = document.querySelector('[role="feed"]');
            if (!feed)
                return 0;
            const items = feed.querySelectorAll('a[href*="maps/place/"], div[role="listitem"]');
            return items.length;
        });
        return typeof count === 'number' ? count : 0;
    }
    catch {
        return 0;
    }
}
//# sourceMappingURL=page-state-detector.js.map