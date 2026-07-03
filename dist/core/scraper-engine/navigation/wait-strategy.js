"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitForResultsFeed = waitForResultsFeed;
exports.waitForBusinessCards = waitForBusinessCards;
exports.waitForSearchBox = waitForSearchBox;
exports.waitForPageStable = waitForPageStable;
exports.waitForDetailPanel = waitForDetailPanel;
exports.waitForNavigationComplete = waitForNavigationComplete;
exports.waitForContentStable = waitForContentStable;
exports.waitForListUpdate = waitForListUpdate;
async function waitForResultsFeed(page, timeoutMs = 10000) {
    try {
        await page.waitForSelector('[role="feed"]', { timeout: timeoutMs });
        return true;
    }
    catch {
        return false;
    }
}
async function waitForBusinessCards(page, minCards = 1, timeoutMs = 8000) {
    try {
        await page.waitForFunction((min) => {
            const feed = document.querySelector('[role="feed"]');
            if (!feed)
                return false;
            const links = feed.querySelectorAll('a[href*="/maps/place/"]');
            return links.length >= min;
        }, minCards, { timeout: timeoutMs });
        const count = await page.evaluate(() => {
            const feed = document.querySelector('[role="feed"]');
            if (!feed)
                return 0;
            return feed.querySelectorAll('a[href*="/maps/place/"]').length;
        });
        return count;
    }
    catch {
        const current = await page.evaluate(() => {
            const feed = document.querySelector('[role="feed"]');
            if (!feed)
                return 0;
            return feed.querySelectorAll('a[href*="/maps/place/"]').length;
        }).catch(() => 0);
        return current;
    }
}
async function waitForSearchBox(page, timeoutMs = 5000) {
    const selectors = [
        '#searchboxinput',
        'input[name="q"]',
        'input[aria-label*="Search"]',
        'input[placeholder*="Search"]',
        'div#searchbox input',
    ];
    for (const selector of selectors) {
        try {
            await page.waitForSelector(selector, { timeout: timeoutMs });
            return true;
        }
        catch {
            continue;
        }
    }
    return false;
}
async function waitForPageStable(page, timeoutMs = 5000) {
    try {
        await page.evaluate((timeout) => {
            return new Promise((resolve) => {
                const observer = new MutationObserver(() => {
                    clearTimeout(timer);
                    timer = setTimeout(() => {
                        observer.disconnect();
                        resolve();
                    }, 500);
                });
                let timer = setTimeout(() => {
                    observer.disconnect();
                    resolve();
                }, timeout);
                observer.observe(document.body, {
                    childList: true,
                    subtree: true,
                    attributes: false,
                });
            });
        }, timeoutMs);
    }
    catch {
        await page.waitForLoadState('domcontentloaded').catch(() => { });
    }
}
async function waitForDetailPanel(page, timeoutMs = 8000) {
    const selectors = [
        '[role="main"] h1',
        'button[data-item-id*="address"]',
        'div.lMbq3e',
        'div.TIHn2',
        'div[class*="business"]',
        'div[role="main"]',
    ];
    for (const selector of selectors) {
        try {
            await page.waitForSelector(selector, { timeout: timeoutMs });
            return true;
        }
        catch {
            continue;
        }
    }
    return false;
}
async function waitForNavigationComplete(page, url, timeoutMs = 15000) {
    try {
        const promises = [
            page.waitForLoadState('networkidle', { timeout: timeoutMs }).catch(() => { }),
        ];
        if (url) {
            promises.push(page.waitForURL(url, { timeout: timeoutMs }).catch(() => { }));
        }
        await Promise.allSettled(promises);
        return true;
    }
    catch {
        return false;
    }
}
async function waitForContentStable(page, selector, timeoutMs = 5000) {
    try {
        await page.evaluate(({ sel, timeout }) => {
            return new Promise((resolve) => {
                const target = document.querySelector(sel);
                if (!target) {
                    resolve();
                    return;
                }
                const observer = new MutationObserver(() => {
                    clearTimeout(timer);
                    timer = setTimeout(() => {
                        observer.disconnect();
                        resolve();
                    }, 300);
                });
                let timer = setTimeout(() => {
                    observer.disconnect();
                    resolve();
                }, timeout);
                observer.observe(target, {
                    childList: true,
                    subtree: true,
                    attributes: false,
                });
            });
        }, { sel: selector, timeout: timeoutMs });
        return true;
    }
    catch {
        return false;
    }
}
async function waitForListUpdate(page, currentCount, timeoutMs = 5000) {
    try {
        await page.waitForFunction((min) => {
            const feed = document.querySelector('[role="feed"]');
            if (!feed)
                return false;
            return feed.querySelectorAll('a[href*="/maps/place/"]').length > min;
        }, currentCount, { timeout: timeoutMs });
        return await page.evaluate(() => {
            const feed = document.querySelector('[role="feed"]');
            if (!feed)
                return 0;
            return feed.querySelectorAll('a[href*="/maps/place/"]').length;
        });
    }
    catch {
        return currentCount;
    }
}
//# sourceMappingURL=wait-strategy.js.map