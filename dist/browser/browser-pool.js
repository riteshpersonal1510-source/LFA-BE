"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserPool = void 0;
const logger_1 = require("../utils/logger");
const browser_manager_1 = require("../browser/browser-manager");
class BrowserPool {
    constructor(options) {
        this.browsers = new Map();
        this.options = options;
    }
    async initialize() {
        logger_1.logger.info(`BrowserPool: Initializing pool with max ${this.options.maxBrowsers} browsers`);
    }
    async acquire(sessionId) {
        if (!this.browsers.has(sessionId)) {
            if (this.browsers.size >= this.options.maxBrowsers) {
                const oldestSession = this.browsers.keys().next().value;
                if (oldestSession) {
                    await this.release(oldestSession);
                }
            }
            const browserManager = new browser_manager_1.PlaywrightBrowser();
            await browserManager.initialize();
            this.browsers.set(sessionId, browserManager);
            logger_1.logger.info(`BrowserPool: Acquired browser for session ${sessionId}`);
        }
        const browserManager = this.browsers.get(sessionId);
        const managed = browserManager.getManaged();
        return {
            browser: managed.browser,
            context: managed.context,
            page: managed.page,
        };
    }
    async release(sessionId) {
        const browserManager = this.browsers.get(sessionId);
        if (browserManager) {
            await browserManager.close();
            this.browsers.delete(sessionId);
            logger_1.logger.info(`BrowserPool: Released browser for session ${sessionId}`);
        }
    }
    async restart(sessionId) {
        logger_1.logger.info(`BrowserPool: Restarting browser for session ${sessionId}`);
        await this.release(sessionId);
        await this.acquire(sessionId);
    }
    async restartAll() {
        logger_1.logger.info('BrowserPool: Restarting all browsers');
        for (const sessionId of this.browsers.keys()) {
            await this.restart(sessionId);
        }
    }
    async closeAll() {
        logger_1.logger.info('BrowserPool: Closing all browsers');
        for (const sessionId of this.browsers.keys()) {
            await this.release(sessionId);
        }
    }
    getActiveCount() {
        return this.browsers.size;
    }
    getBrowserCount() {
        return this.browsers.size;
    }
    getBrowser(sessionId) {
        return this.browsers.get(sessionId);
    }
    hasSession(sessionId) {
        return this.browsers.has(sessionId);
    }
}
exports.BrowserPool = BrowserPool;
//# sourceMappingURL=browser-pool.js.map