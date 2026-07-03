"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const responsive_audit_controller_1 = require("../controllers/responsive-audit.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const validate_objectid_middleware_1 = require("../middlewares/validate-objectid.middleware");
const router = (0, express_1.Router)();
router.post('/audit/:leadId', auth_middleware_1.authenticate, (0, validate_objectid_middleware_1.validateObjectId)('leadId'), (req, res) => responsive_audit_controller_1.responsiveAuditController.auditSingleLead(req, res));
router.post('/audit-bulk', auth_middleware_1.authenticate, (req, res) => responsive_audit_controller_1.responsiveAuditController.auditMultipleLeads(req, res));
router.post('/audit-pending', auth_middleware_1.authenticate, (req, res) => responsive_audit_controller_1.responsiveAuditController.auditLeadsWithoutAudit(req, res));
router.get('/stats', auth_middleware_1.authenticate, (req, res) => responsive_audit_controller_1.responsiveAuditController.getAuditStats(req, res));
router.post('/reaudit/:leadId', auth_middleware_1.authenticate, (0, validate_objectid_middleware_1.validateObjectId)('leadId'), (req, res) => responsive_audit_controller_1.responsiveAuditController.reauditLead(req, res));
exports.default = router;
//# sourceMappingURL=responsive-audit.route.js.map