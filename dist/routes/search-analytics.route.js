"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const search_analytics_controller_1 = require("../controllers/search-analytics.controller");
const router = (0, express_1.Router)();
router.get('/recent', search_analytics_controller_1.searchAnalyticsController.getRecent.bind(search_analytics_controller_1.searchAnalyticsController));
router.get('/keyword', search_analytics_controller_1.searchAnalyticsController.getByKeyword.bind(search_analytics_controller_1.searchAnalyticsController));
router.get('/:sessionId', search_analytics_controller_1.searchAnalyticsController.getBySessionId.bind(search_analytics_controller_1.searchAnalyticsController));
exports.default = router;
//# sourceMappingURL=search-analytics.route.js.map