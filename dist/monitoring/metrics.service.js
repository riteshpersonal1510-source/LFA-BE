"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsService = exports.MetricsService = void 0;
const logger_1 = require("../utils/logger");
const scraper_monitor_1 = require("./scraper-monitor");
class MetricsService {
    constructor() { }
    async getStatus() {
        return scraper_monitor_1.scraperMonitor.getMetrics();
    }
    async getMetrics() {
        return scraper_monitor_1.scraperMonitor.getMetrics();
    }
    async getSuccessRate() {
        return scraper_monitor_1.scraperMonitor.getSuccessRate();
    }
    async getFailureRate() {
        return scraper_monitor_1.scraperMonitor.getFailureRate();
    }
    async getDetailedMetrics() {
        const metrics = scraper_monitor_1.scraperMonitor.getMetrics();
        const successRate = scraper_monitor_1.scraperMonitor.getSuccessRate();
        const failureRate = scraper_monitor_1.scraperMonitor.getFailureRate();
        const avgTime = metrics.averageScrapeTime;
        let fast = 0;
        let medium = 0;
        let slow = 0;
        if (avgTime < 10)
            fast = 1;
        else if (avgTime < 30)
            medium = 1;
        else
            slow = 1;
        return {
            summary: metrics,
            successRate,
            failureRate,
            scrapeTimeDistribution: { fast, medium, slow },
        };
    }
    async reset() {
        scraper_monitor_1.scraperMonitor.reset();
        logger_1.logger.info('MetricsService: Metrics reset');
    }
    async start() {
        logger_1.logger.info('MetricsService: Starting metrics collection');
    }
    async stop() {
        logger_1.logger.info('MetricsService: Stopping metrics collection');
    }
}
exports.MetricsService = MetricsService;
exports.metricsService = new MetricsService();
//# sourceMappingURL=metrics.service.js.map