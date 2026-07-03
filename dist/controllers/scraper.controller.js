"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scraperController = exports.ScraperController = void 0;
const scraper_manager_1 = require("../scraper-core/scraper-manager");
const metrics_service_1 = require("../monitoring/metrics.service");
const api_response_1 = require("../utils/api-response");
const search_status_service_1 = require("../services/search-status.service");
class ScraperController {
    async getStatus(_req, res, next) {
        try {
            const status = scraper_manager_1.scraperManager.getStatus();
            const metrics = await metrics_service_1.metricsService.getMetrics();
            const successRate = await metrics_service_1.metricsService.getSuccessRate();
            api_response_1.APIResponse.success(res, {
                status,
                metrics,
                successRate,
            }, 'Scraper status fetched successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async getMetrics(_req, res, next) {
        try {
            const detailedMetrics = await metrics_service_1.metricsService.getDetailedMetrics();
            api_response_1.APIResponse.success(res, detailedMetrics, 'Scraper metrics fetched successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async restart(_req, res, next) {
        try {
            await scraper_manager_1.scraperManager.restart();
            await metrics_service_1.metricsService.reset();
            api_response_1.APIResponse.success(res, null, 'Scraper restarted successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async getSessions(_req, res, next) {
        try {
            const status = scraper_manager_1.scraperManager.getStatus();
            api_response_1.APIResponse.success(res, {
                activeSessions: status.activeSessions,
                queueLength: status.queueLength,
            }, 'Active sessions fetched successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async getSearchStatus(req, res, next) {
        try {
            const { sessionId } = req.params;
            const progress = await search_status_service_1.searchStatus.getProgressFromDB(sessionId);
            if (!progress) {
                res.status(404).json({
                    success: false,
                    message: 'Search session not found',
                });
                return;
            }
            res.json({
                success: true,
                data: search_status_service_1.searchStatus.toApiResponse(progress),
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ScraperController = ScraperController;
exports.scraperController = new ScraperController();
//# sourceMappingURL=scraper.controller.js.map