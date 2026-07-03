"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.browserPool = exports.BrowserPool = void 0;
const playwright_1 = require("playwright");
const logger_1 = require("../utils/logger");
const BROWSER_ARGS = [
    '--disable-blink-features=AutomationControlled',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-webgl',
    '--disable-accelerated-2d-canvas',
    '--window-size=1920,1080',
];
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const BLOCKED_RESOURCE_TYPES = new Set([
    'image', 'media', 'font', 'stylesheet',
    'imageset', 'svg', 'beacon',
]);
const BLOCKED_DOMAINS = [
    'google-analytics.com',
    'googletagmanager.com',
    'facebook.net',
    'facebook.com/tr',
    'doubleclick.net',
    'cdn.cookie-script.com',
    'cdn.userway.org',
    'cdn.onesignal.com',
    'hotjar.com',
    'clarity.ms',
    'bat.bing.com',
];
const MAX_POOL_SIZE = 3;
const BROWSER_IDLE_TIMEOUT_MS = 120000;
const PAGE_TIMEOUT_MS = 30000;
const BROWSER_LAUNCH_TIMEOUT_MS = 15000;
class BrowserPool {
    constructor(maxSize = MAX_POOL_SIZE) {
        this.pool = [];
        this.cleanupTimer = null;
        this.maxSize = maxSize;
        this.startCleanupTimer();
        logger_1.logger.info({
            maxPoolSize: this.maxSize,
            idleTimeoutMs: BROWSER_IDLE_TIMEOUT_MS,
        }, 'BrowserPool: Initialized');
    }
    async acquire(sourceName) {
        const pooled = this.findIdleBrowser();
        const browserInstance = pooled || await this.launchNewBrowser();
        if (!browserInstance) {
            throw new Error('BrowserPool: Failed to acquire browser instance');
        }
        browserInstance.inUse = true;
        browserInstance.lastUsed = Date.now();
        const page = await browserInstance.context.newPage();
        page.setDefaultTimeout(PAGE_TIMEOUT_MS);
        page.setDefaultNavigationTimeout(PAGE_TIMEOUT_MS);
        await this.setupPageAborts(page);
        browserInstance.pages.add(page);
        logger_1.logger.debug({
            source: sourceName,
            poolSize: this.pool.length,
            activePages: browserInstance.pages.size,
        }, 'BrowserPool: Page acquired');
        return { page, browser: browserInstance.browser, context: browserInstance.context };
    }
    async release(page, sourceName) {
        try {
            const pooled = this.pool.find(p => p.pages.has(page));
            if (pooled) {
                pooled.pages.delete(page);
                pooled.lastUsed = Date.now();
                pooled.inUse = pooled.pages.size > 0;
                try {
                    await page.close();
                }
                catch {
                }
                logger_1.logger.debug({
                    source: sourceName,
                    remainingPages: pooled.pages.size,
                }, 'BrowserPool: Page released');
            }
        }
        catch (error) {
            logger_1.logger.warn({
                err: error instanceof Error ? error.message : String(error),
                source: sourceName,
            }, 'BrowserPool: Release error');
        }
    }
    async shutdown() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        logger_1.logger.info({ poolSize: this.pool.length }, 'BrowserPool: Shutting down');
        for (const pooled of this.pool) {
            await this.destroyBrowser(pooled);
        }
        this.pool = [];
    }
    async reset() {
        await this.shutdown();
        this.startCleanupTimer();
        logger_1.logger.info({}, 'BrowserPool: Reset complete');
    }
    getStatus() {
        const active = this.pool.filter(p => p.inUse).length;
        const idle = this.pool.filter(p => !p.inUse).length;
        return { poolSize: this.pool.length, activeBrowsers: active, idleBrowsers: idle };
    }
    findIdleBrowser() {
        return this.pool.find(p => !p.inUse && p.pages.size < 5) || null;
    }
    async launchNewBrowser() {
        if (this.pool.length >= this.maxSize) {
            const oldestIdle = this.pool
                .filter(p => !p.inUse)
                .sort((a, b) => a.lastUsed - b.lastUsed)[0];
            if (oldestIdle) {
                logger_1.logger.info({}, 'BrowserPool: Reusing oldest idle browser');
                oldestIdle.inUse = true;
                return oldestIdle;
            }
            throw new Error('BrowserPool: Max pool size reached and no idle browsers available');
        }
        try {
            const browser = await playwright_1.chromium.launch({
                headless: true,
                args: BROWSER_ARGS,
                timeout: BROWSER_LAUNCH_TIMEOUT_MS,
            });
            const context = await browser.newContext({
                viewport: { width: 1920, height: 1080 },
                userAgent: USER_AGENT,
                locale: 'en-US',
                timezoneId: 'Asia/Kolkata',
                geolocation: { latitude: 23.0225, longitude: 72.5714 },
                permissions: ['geolocation'],
                ignoreHTTPSErrors: true,
            });
            const pooled = {
                browser,
                context,
                pages: new Set(),
                lastUsed: Date.now(),
                inUse: true,
            };
            this.pool.push(pooled);
            logger_1.logger.info({
                poolSize: this.pool.length,
                maxSize: this.maxSize,
            }, 'BrowserPool: New browser launched');
            return pooled;
        }
        catch (error) {
            logger_1.logger.error({
                err: error instanceof Error ? error.message : String(error),
                poolSize: this.pool.length,
            }, 'BrowserPool: Failed to launch browser');
            return null;
        }
    }
    async setupPageAborts(page) {
        await page.route('**/*', async (route) => {
            const url = route.request().url().toLowerCase();
            const resourceType = route.request().resourceType();
            if (BLOCKED_RESOURCE_TYPES.has(resourceType)) {
                await route.abort();
                return;
            }
            for (const domain of BLOCKED_DOMAINS) {
                if (url.includes(domain)) {
                    await route.abort();
                    return;
                }
            }
            await route.continue();
        });
    }
    async destroyBrowser(pooled) {
        try {
            for (const page of pooled.pages) {
                try {
                    await page.close();
                }
                catch {
                }
            }
            pooled.pages.clear();
            try {
                await pooled.context.close();
            }
            catch {
            }
            try {
                await pooled.browser.close();
            }
            catch {
            }
        }
        catch {
        }
    }
    startCleanupTimer() {
        this.cleanupTimer = setInterval(async () => {
            const now = Date.now();
            const toRemove = [];
            for (const pooled of this.pool) {
                if (!pooled.inUse && (now - pooled.lastUsed) > BROWSER_IDLE_TIMEOUT_MS) {
                    toRemove.push(pooled);
                }
            }
            for (const pooled of toRemove) {
                this.pool = this.pool.filter(p => p !== pooled);
                await this.destroyBrowser(pooled);
                logger_1.logger.info({
                    idleTimeMs: now - pooled.lastUsed,
                    poolSize: this.pool.length,
                }, 'BrowserPool: Idle browser cleaned up');
            }
        }, 30000);
    }
}
exports.BrowserPool = BrowserPool;
exports.browserPool = new BrowserPool(MAX_POOL_SIZE);
//# sourceMappingURL=browser-pool.service.js.map