"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scraperManager = exports.ScraperManager = void 0;
const logger_1 = require("../utils/logger");
const browser_pool_1 = require("../browser/browser-pool");
const retry_handler_1 = require("../recovery/retry-handler");
const timeout_handler_1 = require("../recovery/timeout-handler");
const scraper_session_1 = require("./scraper-session");
const scraper_worker_1 = require("./scraper-worker");
class ScraperManager {
    constructor(options = {}) {
        this.options = {
            maxConcurrentScrapes: 3,
            maxRetries: 3,
            timeout: 120000,
            headless: true,
            ...options,
        };
        this.browserPool = new browser_pool_1.BrowserPool({
            maxBrowsers: this.options.maxConcurrentScrapes,
            headless: this.options.headless,
        });
        this.retryHandler = new retry_handler_1.RetryHandler(this.options.maxRetries);
        this.timeoutHandler = new timeout_handler_1.TimeoutHandler(this.options.timeout);
        this.worker = new scraper_worker_1.ScraperWorker(this.browserPool);
    }
    async start() {
        logger_1.logger.info('ScraperManager: Starting');
        await this.browserPool.initialize();
        logger_1.logger.info('ScraperManager: Started');
    }
    async stop() {
        logger_1.logger.info('ScraperManager: Stopping');
        await this.browserPool.closeAll();
        logger_1.logger.info('ScraperManager: Stopped');
    }
    async scrape(options) {
        const { keyword, location, limit = 50 } = options;
        logger_1.logger.info({ keyword, location, limit }, 'ScraperManager: Starting scrape');
        const session = new scraper_session_1.ScraperSession(keyword, location || '', limit);
        try {
            const result = await this.timeoutHandler.withTimeout(() => this.retryHandler.withRetry(() => this.worker.execute(session, options)), this.options.timeout, `Scrape timeout for "${keyword}" in "${location}"`);
            logger_1.logger.info({ keyword, stored: result.totalStored, extracted: result.totalExtracted }, 'ScraperManager: Scrape completed');
            return result;
        }
        catch (error) {
            logger_1.logger.error({ err: error.message, keyword, location }, 'ScraperManager: Scrape failed');
            try {
                await this.browserPool.restart(session.id);
            }
            catch (restartError) {
                logger_1.logger.warn({ err: restartError.message }, 'ScraperManager: Browser restart failed');
            }
            throw error;
        }
    }
    getStatus() {
        return {
            activeSessions: this.browserPool.getActiveCount(),
            browserCount: this.browserPool.getBrowserCount(),
            queueLength: this.retryHandler.getQueueLength(),
            uptime: 0,
        };
    }
    getMetrics() {
        return {
            totalScrapes: 0,
            successfulScrapes: 0,
            failedScrapes: 0,
            averageScrapeTime: 0,
        };
    }
    async restart() {
        logger_1.logger.info('ScraperManager: Restarting browser pool');
        await this.browserPool.restartAll();
        logger_1.logger.info('ScraperManager: Browser pool restarted');
    }
}
exports.ScraperManager = ScraperManager;
exports.scraperManager = new ScraperManager();
//# sourceMappingURL=scraper-manager.js.map