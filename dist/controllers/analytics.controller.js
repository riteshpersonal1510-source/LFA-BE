"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsController = exports.AnalyticsController = void 0;
const analytics_service_1 = require("../services/analytics.service");
const api_response_1 = require("../utils/api-response");
class AnalyticsController {
    async getOverview(req, res, next) {
        try {
            const startDate = req.query.startDate?.toString();
            const endDate = req.query.endDate?.toString();
            const filter = {};
            if (startDate)
                filter.startDate = new Date(startDate);
            if (endDate)
                filter.endDate = new Date(endDate);
            const data = await analytics_service_1.analyticsService.getOverview(filter);
            api_response_1.APIResponse.success(res, data, 'Overview analytics fetched successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async getLeadAnalytics(req, res, next) {
        try {
            const startDate = req.query.startDate?.toString();
            const endDate = req.query.endDate?.toString();
            const filter = {};
            if (startDate)
                filter.startDate = new Date(startDate);
            if (endDate)
                filter.endDate = new Date(endDate);
            const data = await analytics_service_1.analyticsService.getLeadAnalytics(filter);
            api_response_1.APIResponse.success(res, data, 'Lead analytics fetched successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async getScrapingAnalytics(req, res, next) {
        try {
            const startDate = req.query.startDate?.toString();
            const endDate = req.query.endDate?.toString();
            const filter = {};
            if (startDate)
                filter.startDate = new Date(startDate);
            if (endDate)
                filter.endDate = new Date(endDate);
            const data = await analytics_service_1.analyticsService.getScrapingAnalytics(filter);
            api_response_1.APIResponse.success(res, data, 'Scraping analytics fetched successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async getAutomationAnalytics(req, res, next) {
        try {
            const startDate = req.query.startDate?.toString();
            const endDate = req.query.endDate?.toString();
            const filter = {};
            if (startDate)
                filter.startDate = new Date(startDate);
            if (endDate)
                filter.endDate = new Date(endDate);
            const data = await analytics_service_1.analyticsService.getAutomationAnalytics(filter);
            api_response_1.APIResponse.success(res, data, 'Automation analytics fetched successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async getCategoryDistribution(req, res, next) {
        try {
            const startDate = req.query.startDate?.toString();
            const endDate = req.query.endDate?.toString();
            const filter = {};
            if (startDate)
                filter.startDate = new Date(startDate);
            if (endDate)
                filter.endDate = new Date(endDate);
            const data = await analytics_service_1.analyticsService.getCategoryDistribution(filter);
            api_response_1.APIResponse.success(res, data, 'Category distribution fetched successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async getLeadsPerDay(req, res, next) {
        try {
            const startDate = req.query.startDate?.toString();
            const endDate = req.query.endDate?.toString();
            const filter = {};
            if (startDate)
                filter.startDate = new Date(startDate);
            if (endDate)
                filter.endDate = new Date(endDate);
            const data = await analytics_service_1.analyticsService.getLeadsPerDay(filter);
            api_response_1.APIResponse.success(res, data, 'Leads per day fetched successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async getQualificationDistribution(req, res, next) {
        try {
            const startDate = req.query.startDate?.toString();
            const endDate = req.query.endDate?.toString();
            const filter = {};
            if (startDate)
                filter.startDate = new Date(startDate);
            if (endDate)
                filter.endDate = new Date(endDate);
            const data = await analytics_service_1.analyticsService.getQualificationDistribution(filter);
            api_response_1.APIResponse.success(res, data, 'Qualification distribution fetched successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async getWebsiteStatusDistribution(req, res, next) {
        try {
            const startDate = req.query.startDate?.toString();
            const endDate = req.query.endDate?.toString();
            const filter = {};
            if (startDate)
                filter.startDate = new Date(startDate);
            if (endDate)
                filter.endDate = new Date(endDate);
            const data = await analytics_service_1.analyticsService.getWebsiteStatusDistribution(filter);
            api_response_1.APIResponse.success(res, data, 'Website status distribution fetched successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async getAreaDensity(req, res, next) {
        try {
            const startDate = req.query.startDate?.toString();
            const endDate = req.query.endDate?.toString();
            const filter = {};
            if (startDate)
                filter.startDate = new Date(startDate);
            if (endDate)
                filter.endDate = new Date(endDate);
            const data = await analytics_service_1.analyticsService.getAreaDensity(filter);
            api_response_1.APIResponse.success(res, data, 'Area density fetched successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async getTopAreas(req, res, next) {
        try {
            const startDate = req.query.startDate?.toString();
            const endDate = req.query.endDate?.toString();
            const limit = parseInt(req.query.limit?.toString() || '10', 10);
            const filter = {};
            if (startDate)
                filter.startDate = new Date(startDate);
            if (endDate)
                filter.endDate = new Date(endDate);
            const data = await analytics_service_1.analyticsService.getTopAreas(filter, limit);
            api_response_1.APIResponse.success(res, data, 'Top areas fetched successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async getTopLocations(req, res, next) {
        try {
            const startDate = req.query.startDate?.toString();
            const endDate = req.query.endDate?.toString();
            const filter = {};
            if (startDate)
                filter.startDate = new Date(startDate);
            if (endDate)
                filter.endDate = new Date(endDate);
            const data = await analytics_service_1.analyticsService.getTopLocations(filter);
            api_response_1.APIResponse.success(res, data, 'Top locations fetched successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async getHighestScoringBusinesses(req, res, next) {
        try {
            const startDate = req.query.startDate?.toString();
            const endDate = req.query.endDate?.toString();
            const limit = parseInt(req.query.limit?.toString() || '10', 10);
            const filter = {};
            if (startDate)
                filter.startDate = new Date(startDate);
            if (endDate)
                filter.endDate = new Date(endDate);
            const data = await analytics_service_1.analyticsService.getHighestScoringBusinesses(filter, limit);
            api_response_1.APIResponse.success(res, data, 'Highest scoring businesses fetched successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async getRecentScrapingHistory(req, res, next) {
        try {
            const limit = parseInt(req.query.limit?.toString() || '10', 10);
            const data = await analytics_service_1.analyticsService.getRecentScrapingHistory(limit);
            api_response_1.APIResponse.success(res, data, 'Recent scraping history fetched successfully');
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AnalyticsController = AnalyticsController;
exports.analyticsController = new AnalyticsController();
//# sourceMappingURL=analytics.controller.js.map