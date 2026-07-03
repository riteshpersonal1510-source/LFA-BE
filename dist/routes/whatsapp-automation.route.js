"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const whatsapp_automation_controller_1 = require("../controllers/whatsapp-automation.controller");
const error_handler_1 = require("../utils/error-handler");
const router = (0, express_1.Router)();
router.get('/leads', (0, error_handler_1.asyncHandler)((req, res, next) => whatsapp_automation_controller_1.whatsAppAutomationController.getLeads(req, res, next)));
router.post('/generate-messages', (0, error_handler_1.asyncHandler)((req, res, next) => whatsapp_automation_controller_1.whatsAppAutomationController.generateMessages(req, res, next)));
router.post('/track', (0, error_handler_1.asyncHandler)((req, res, next) => whatsapp_automation_controller_1.whatsAppAutomationController.trackOutreachAction(req, res, next)));
router.post('/bulk-update', (0, error_handler_1.asyncHandler)((req, res, next) => whatsapp_automation_controller_1.whatsAppAutomationController.bulkUpdateStatus(req, res, next)));
router.get('/stats', (0, error_handler_1.asyncHandler)((req, res, next) => whatsapp_automation_controller_1.whatsAppAutomationController.getStats(req, res, next)));
exports.default = router;
//# sourceMappingURL=whatsapp-automation.route.js.map