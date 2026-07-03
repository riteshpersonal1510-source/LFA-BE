"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageManager = void 0;
const logger_1 = require("../utils/logger");
class PageManager {
    constructor(page, options = {}) {
        this.page = page;
        this.options = {
            defaultTimeout: 30000,
            navigationTimeout: 15000,
            extractionTimeout: 10000,
            ...options,
        };
        this.page.setDefaultTimeout(this.options.defaultTimeout);
    }
    async navigate(url) {
        logger_1.logger.info(`PageManager: Navigating to ${url}`);
        await this.page.goto(url, {
            waitUntil: 'networkidle',
            timeout: this.options.navigationTimeout,
        });
        logger_1.logger.info(`PageManager: Navigation to ${url} completed`);
    }
    async click(selector, options) {
        const timeout = options?.timeout || this.options.extractionTimeout;
        const maxRetries = 3;
        let retryCount = 0;
        while (retryCount < maxRetries) {
            try {
                await this.page.click(selector, { timeout });
                return;
            }
            catch (error) {
                retryCount++;
                logger_1.logger.warn(error instanceof Error ? error : new Error(String(error)), `PageManager: Click retry ${retryCount}/${maxRetries} for ${selector}`);
                if (retryCount >= maxRetries) {
                    throw error;
                }
                await this.page.waitForTimeout(1000);
            }
        }
    }
    async waitForSelector(selector, options) {
        const timeout = options?.timeout || this.options.extractionTimeout;
        await this.page.waitForSelector(selector, { timeout });
    }
    async scrollToBottom() {
        await this.page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
        });
    }
    async getText(selector) {
        try {
            const element = await this.page.$(selector);
            if (element) {
                return await element.innerText();
            }
        }
        catch (error) {
            logger_1.logger.warn(error instanceof Error ? error : new Error(String(error)), `PageManager: Failed to get text for ${selector}`);
        }
        return null;
    }
    async getAttribute(selector, attribute) {
        try {
            const element = await this.page.$(selector);
            if (element) {
                return await element.getAttribute(attribute);
            }
        }
        catch (error) {
            logger_1.logger.warn(error instanceof Error ? error : new Error(String(error)), `PageManager: Failed to get attribute for ${selector}`);
        }
        return null;
    }
    async count(selector) {
        try {
            return await this.page.locator(selector).count();
        }
        catch (error) {
            logger_1.logger.warn(error instanceof Error ? error : new Error(String(error)), `PageManager: Failed to count elements for ${selector}`);
            return 0;
        }
    }
    async waitForNetworkIdle() {
        await this.page.waitForLoadState('networkidle');
    }
    async clearCache() {
        await this.page.context().clearCookies();
    }
    getMetrics() {
        return {
            url: this.page.url(),
            width: this.page.viewportSize()?.width || 1920,
            height: this.page.viewportSize()?.height || 1080,
        };
    }
}
exports.PageManager = PageManager;
//# sourceMappingURL=page-manager.js.map