"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchAnalyticsController = exports.SearchAnalyticsController = void 0;
const SearchAnalytics_1 = require("../models/SearchAnalytics");
const api_response_1 = require("../utils/api-response");
const logger_1 = require("../utils/logger");
class SearchAnalyticsController {
    async getBySessionId(req, res, _next) {
        try {
            const { sessionId } = req.params;
            const analytics = await SearchAnalytics_1.SearchAnalytics.findOne({ sessionId }).lean();
            if (!analytics) {
                res.status(404).json({ success: false, message: 'Search analytics not found' });
                return;
            }
            api_response_1.APIResponse.success(res, analytics);
        }
        catch (error) {
            logger_1.logger.error({ error }, '[SearchAnalytics] Error getting session analytics');
            api_response_1.APIResponse.error(res, 'Failed to get search analytics');
        }
    }
    async getByKeyword(req, res, _next) {
        try {
            const { keyword } = req.query;
            const limit = parseInt(req.query.limit?.toString() || '5', 10);
            const query = {};
            if (keyword)
                query.keyword = { $regex: keyword, $options: 'i' };
            const analytics = await SearchAnalytics_1.SearchAnalytics.find(query)
                .sort({ createdAt: -1 })
                .limit(limit)
                .lean();
            api_response_1.APIResponse.success(res, analytics);
        }
        catch (error) {
            logger_1.logger.error({ error }, '[SearchAnalytics] Error getting keyword analytics');
            api_response_1.APIResponse.error(res, 'Failed to get search analytics');
        }
    }
    async getRecent(req, res, _next) {
        try {
            const limit = parseInt(req.query.limit?.toString() || '10', 10);
            const analytics = await SearchAnalytics_1.SearchAnalytics.find({ status: 'completed' })
                .sort({ createdAt: -1 })
                .limit(limit)
                .lean();
            api_response_1.APIResponse.success(res, analytics);
        }
        catch (error) {
            logger_1.logger.error({ error }, '[SearchAnalytics] Error getting recent analytics');
            api_response_1.APIResponse.error(res, 'Failed to get recent searches');
        }
    }
}
exports.SearchAnalyticsController = SearchAnalyticsController;
exports.searchAnalyticsController = new SearchAnalyticsController();
//# sourceMappingURL=search-analytics.controller.js.map