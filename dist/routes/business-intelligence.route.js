"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const business_intelligence_controller_1 = require("../controllers/business-intelligence.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const validate_objectid_middleware_1 = require("../middlewares/validate-objectid.middleware");
const router = (0, express_1.Router)();
router.post('/analyze/:leadId', auth_middleware_1.authenticate, (0, validate_objectid_middleware_1.validateObjectId)('leadId'), (req, res) => business_intelligence_controller_1.businessIntelligenceController.analyzeSingleLead(req, res));
router.post('/analyze-bulk', auth_middleware_1.authenticate, (req, res) => business_intelligence_controller_1.businessIntelligenceController.analyzeMultipleLeads(req, res));
router.post('/analyze-pending', auth_middleware_1.authenticate, (req, res) => business_intelligence_controller_1.businessIntelligenceController.analyzeLeadsWithoutIntelligence(req, res));
router.get('/stats', auth_middleware_1.authenticate, (req, res) => business_intelligence_controller_1.businessIntelligenceController.getIntelligenceStats(req, res));
router.post('/reanalyze/:leadId', auth_middleware_1.authenticate, (0, validate_objectid_middleware_1.validateObjectId)('leadId'), (req, res) => business_intelligence_controller_1.businessIntelligenceController.reanalyzeLead(req, res));
exports.default = router;
//# sourceMappingURL=business-intelligence.route.js.map