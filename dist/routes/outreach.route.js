"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const outreach_controller_1 = require("../controllers/outreach.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const validate_objectid_middleware_1 = require("../middlewares/validate-objectid.middleware");
const router = (0, express_1.Router)();
router.post('/generate/:leadId', auth_middleware_1.authenticate, (0, validate_objectid_middleware_1.validateObjectId)('leadId'), (req, res) => outreach_controller_1.outreachController.generateForLead(req, res));
router.post('/generate-bulk', auth_middleware_1.authenticate, (req, res) => outreach_controller_1.outreachController.generateForMultipleLeads(req, res));
router.post('/generate-pending', auth_middleware_1.authenticate, (req, res) => outreach_controller_1.outreachController.generateForPendingLeads(req, res));
router.get('/lead/:leadId', auth_middleware_1.authenticate, (0, validate_objectid_middleware_1.validateObjectId)('leadId'), (req, res) => outreach_controller_1.outreachController.getLeadOutreach(req, res));
router.put('/status/:leadId', auth_middleware_1.authenticate, (0, validate_objectid_middleware_1.validateObjectId)('leadId'), (req, res) => outreach_controller_1.outreachController.updateStatus(req, res));
router.get('/stats', auth_middleware_1.authenticate, (req, res) => outreach_controller_1.outreachController.getStats(req, res));
exports.default = router;
//# sourceMappingURL=outreach.route.js.map