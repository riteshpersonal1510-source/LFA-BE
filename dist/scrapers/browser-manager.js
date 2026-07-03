"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaywrightBrowser = void 0;
const playwright_1 = require("playwright");
const logger_1 = require("../utils/logger");
class PlaywrightBrowser {
    constructor() {
        this.browser = null;
        this.context = null;
        this.page = null;
    }
    async initialize() {
        try {
            logger_1.logger.info('Launching browser...');
            this.browser = await playwright_1.chromium.launch({
                headless: true,
                args: [
                    '--disable-blink-features=AutomationControlled',
                    '--disable-extensions',
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                ],
            });
            this.context = await this.browser.newContext({
                viewport: { width: 1920, height: 1080 },
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                permissions: ['geolocation'],
                geolocation: { latitude: 23.0225, longitude: 72.5714 },
            });
            this.page = await this.context.newPage();
            await this.page.addInitScript(() => {
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => false,
                });
            });
            logger_1.logger.info('Browser initialized successfully');
            return {
                browser: this.browser,
                context: this.context,
                page: this.page,
            };
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to initialize browser:');
            throw error;
        }
    }
    async close() {
        try {
            if (this.page) {
                await this.page.close();
                this.page = null;
            }
            if (this.context) {
                await this.context.close();
                this.context = null;
            }
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
            }
            logger_1.logger.info('Browser closed successfully');
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'Error closing browser:');
            throw error;
        }
    }
    async refreshPage() {
        if (this.page) {
            await this.page.reload({ waitUntil: 'networkidle' });
            return this.page;
        }
        throw new Error('Browser not initialized');
    }
    getManaged() {
        if (!this.browser || !this.context || !this.page) {
            throw new Error('Browser not fully initialized');
        }
        return {
            browser: this.browser,
            context: this.context,
            page: this.page,
        };
    }
}
exports.PlaywrightBrowser = PlaywrightBrowser;
//# sourceMappingURL=browser-manager.js.map