"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const whatsapp_template_controller_1 = require("../controllers/whatsapp-template.controller");
const error_handler_1 = require("../utils/error-handler");
const router = (0, express_1.Router)();
router.get('/', (0, error_handler_1.asyncHandler)((req, res, next) => whatsapp_template_controller_1.whatsAppTemplateController.getTemplates(req, res, next)));
router.put('/website', (0, error_handler_1.asyncHandler)((req, res, next) => whatsapp_template_controller_1.whatsAppTemplateController.updateWebsiteTemplate(req, res, next)));
router.put('/no-website', (0, error_handler_1.asyncHandler)((req, res, next) => whatsapp_template_controller_1.whatsAppTemplateController.updateNoWebsiteTemplate(req, res, next)));
router.post('/preview', (0, error_handler_1.asyncHandler)((req, res, next) => whatsapp_template_controller_1.whatsAppTemplateController.previewTemplate(req, res, next)));
router.post('/reset', (0, error_handler_1.asyncHandler)((req, res, next) => whatsapp_template_controller_1.whatsAppTemplateController.resetTemplates(req, res, next)));
exports.default = router;
//# sourceMappingURL=whatsapp-templates.route.js.map