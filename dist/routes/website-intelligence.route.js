"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const error_handler_1 = require("../utils/error-handler");
const website_intelligence_controller_1 = require("../controllers/website-intelligence.controller");
const router = (0, express_1.Router)();
router.post('/analyze/:leadId', (0, error_handler_1.asyncHandler)(website_intelligence_controller_1.websiteIntelligenceController.analyzeSingleLead.bind(website_intelligence_controller_1.websiteIntelligenceController)));
router.post('/reanalyze/:leadId', (0, error_handler_1.asyncHandler)(website_intelligence_controller_1.websiteIntelligenceController.reanalyzeLead.bind(website_intelligence_controller_1.websiteIntelligenceController)));
router.post('/analyze-bulk', (0, error_handler_1.asyncHandler)(website_intelligence_controller_1.websiteIntelligenceController.analyzeMultipleLeads.bind(website_intelligence_controller_1.websiteIntelligenceController)));
router.get('/stats', (0, error_handler_1.asyncHandler)(website_intelligence_controller_1.websiteIntelligenceController.getIntelligenceStats.bind(website_intelligence_controller_1.websiteIntelligenceController)));
exports.default = router;
//# sourceMappingURL=website-intelligence.route.js.map