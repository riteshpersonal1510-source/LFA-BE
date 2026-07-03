"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scraperMonitor = exports.ScraperMonitor = void 0;
const logger_1 = require("../utils/logger");
class ScraperMonitor {
    constructor() {
        this.sessionCount = 0;
        this.scrapeCount = 0;
        this.successCount = 0;
        this.failureCount = 0;
        this.crashCount = 0;
        this.totalRetryCount = 0;
        this.scrapeTimes = [];
    }
    trackSessionStart() {
        this.sessionCount++;
        logger_1.logger.info('ScraperMonitor: Session started');
    }
    trackSessionComplete(session, success) {
        const duration = session.getDuration();
        this.scrapeCount++;
        this.lastScrapeTime = new Date();
        if (success) {
            this.successCount++;
            this.scrapeTimes.push(duration);
            if (this.scrapeTimes.length > 100) {
                this.scrapeTimes.shift();
            }
        }
        else {
            this.failureCount++;
        }
        this.sessionCount--;
        this.totalRetryCount += session.retryCount;
        logger_1.logger.info(`ScraperMonitor: Session completed - success: ${success}, time: ${duration}s`);
    }
    trackBrowserCrash() {
        this.crashCount++;
        logger_1.logger.error('ScraperMonitor: Browser crash detected');
    }
    trackRetry() {
        this.totalRetryCount++;
    }
    getMetrics() {
        const avgScrapeTime = this.scrapeTimes.length > 0
            ? this.scrapeTimes.reduce((a, b) => a + b, 0) / this.scrapeTimes.length
            : 0;
        return {
            activeSessions: this.sessionCount,
            totalScrapes: this.scrapeCount,
            successfulScrapes: this.successCount,
            failedScrapes: this.failureCount,
            averageScrapeTime: Math.round(avgScrapeTime * 100) / 100,
            browserCrashes: this.crashCount,
            retryCount: this.totalRetryCount,
            lastScrapeTime: this.lastScrapeTime,
        };
    }
    getSuccessRate() {
        if (this.scrapeCount === 0)
            return 0;
        return (this.successCount / this.scrapeCount) * 100;
    }
    getFailureRate() {
        if (this.scrapeCount === 0)
            return 0;
        return (this.failureCount / this.scrapeCount) * 100;
    }
    reset() {
        this.sessionCount = 0;
        this.scrapeCount = 0;
        this.successCount = 0;
        this.failureCount = 0;
        this.crashCount = 0;
        this.totalRetryCount = 0;
        this.scrapeTimes = [];
        this.lastScrapeTime = undefined;
        logger_1.logger.info('ScraperMonitor: Metrics reset');
    }
}
exports.ScraperMonitor = ScraperMonitor;
exports.scraperMonitor = new ScraperMonitor();
//# sourceMappingURL=scraper-monitor.js.map