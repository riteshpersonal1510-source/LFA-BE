"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const semantic_search_controller_1 = require("../controllers/semantic-search.controller");
const error_handler_1 = require("../utils/error-handler");
const router = (0, express_1.Router)();
router.post('/expand', (0, error_handler_1.asyncHandler)(semantic_search_controller_1.semanticSearchController.expandKeywords.bind(semantic_search_controller_1.semanticSearchController)));
router.get('/status', (0, error_handler_1.asyncHandler)(semantic_search_controller_1.semanticSearchController.getSearchStatus.bind(semantic_search_controller_1.semanticSearchController)));
router.get('/categories', (0, error_handler_1.asyncHandler)(semantic_search_controller_1.semanticSearchController.getCategoryGroups.bind(semantic_search_controller_1.semanticSearchController)));
router.get('/analytics', (0, error_handler_1.asyncHandler)(semantic_search_controller_1.semanticSearchController.getSearchCoverageAnalytics.bind(semantic_search_controller_1.semanticSearchController)));
router.get('/sessions/:sessionId', (0, error_handler_1.asyncHandler)(semantic_search_controller_1.semanticSearchController.getSessionCoverage.bind(semantic_search_controller_1.semanticSearchController)));
exports.default = router;
//# sourceMappingURL=semantic-search.route.js.map