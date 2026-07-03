"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sales_intelligence_controller_1 = require("../controllers/sales-intelligence.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const validate_objectid_middleware_1 = require("../middlewares/validate-objectid.middleware");
const router = (0, express_1.Router)();
router.post('/analyze/:leadId', auth_middleware_1.authenticate, (0, validate_objectid_middleware_1.validateObjectId)('leadId'), (req, res) => sales_intelligence_controller_1.salesIntelligenceController.analyzeSingleLead(req, res));
router.post('/analyze-bulk', auth_middleware_1.authenticate, (req, res) => sales_intelligence_controller_1.salesIntelligenceController.analyzeMultipleLeads(req, res));
router.post('/analyze-pending', auth_middleware_1.authenticate, (req, res) => sales_intelligence_controller_1.salesIntelligenceController.analyzeLeadsWithoutAnalysis(req, res));
router.get('/stats', auth_middleware_1.authenticate, (req, res) => sales_intelligence_controller_1.salesIntelligenceController.getSalesStats(req, res));
exports.default = router;
//# sourceMappingURL=sales-intelligence.route.js.map