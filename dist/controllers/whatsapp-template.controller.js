"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsAppTemplateController = exports.WhatsAppTemplateController = void 0;
const whatsapp_templates_service_1 = require("../services/whatsapp-templates.service");
const logger_1 = require("../utils/logger");
class WhatsAppTemplateController {
    async getTemplates(_req, res, _next) {
        try {
            const templates = await whatsapp_templates_service_1.whatsAppTemplatesService.getTemplates();
            res.status(200).json({ success: true, data: templates });
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error({ err: errMsg }, '[WhatsAppTemplates] getTemplates error');
            res.status(500).json({ success: false, message: `Failed to fetch templates: ${errMsg}` });
        }
    }
    async updateWebsiteTemplate(req, res, _next) {
        try {
            const { message, name } = req.body;
            if (!message || typeof message !== 'string' || message.trim().length === 0) {
                res.status(400).json({ success: false, message: 'Message is required and cannot be empty' });
                return;
            }
            const sanitized = whatsapp_templates_service_1.whatsAppTemplatesService.sanitizeMessage(message);
            if (sanitized.length === 0) {
                res.status(400).json({ success: false, message: 'Message cannot be empty after trimming' });
                return;
            }
            await whatsapp_templates_service_1.whatsAppTemplatesService.updateTemplate('website', sanitized, name);
            res.status(200).json({
                success: true,
                message: 'Website template saved successfully',
                data: { name: name || 'Website Template', message: sanitized },
            });
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error({ err: errMsg }, '[WhatsAppTemplates] updateWebsiteTemplate error');
            res.status(500).json({ success: false, message: `Failed to update website template: ${errMsg}` });
        }
    }
    async updateNoWebsiteTemplate(req, res, _next) {
        try {
            const { message, name } = req.body;
            if (!message || typeof message !== 'string' || message.trim().length === 0) {
                res.status(400).json({ success: false, message: 'Message is required and cannot be empty' });
                return;
            }
            const sanitized = whatsapp_templates_service_1.whatsAppTemplatesService.sanitizeMessage(message);
            if (sanitized.length === 0) {
                res.status(400).json({ success: false, message: 'Message cannot be empty after trimming' });
                return;
            }
            await whatsapp_templates_service_1.whatsAppTemplatesService.updateTemplate('no_website', sanitized, name);
            res.status(200).json({
                success: true,
                message: 'No-Website template saved successfully',
                data: { name: name || 'No Website Template', message: sanitized },
            });
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error({ err: errMsg }, '[WhatsAppTemplates] updateNoWebsiteTemplate error');
            res.status(500).json({ success: false, message: `Failed to update no-website template: ${errMsg}` });
        }
    }
    async previewTemplate(req, res, _next) {
        try {
            const { type, message } = req.body;
            if (!type || !['website', 'no_website'].includes(type)) {
                res.status(400).json({ success: false, message: 'type must be "website" or "no_website"' });
                return;
            }
            if (!message) {
                res.status(400).json({ success: false, message: 'message is required' });
                return;
            }
            const sampleLead = whatsapp_templates_service_1.whatsAppTemplatesService.getSampleLeadData();
            const senderInfo = { name: '', phone: '', email: '', website: '' };
            const rendered = whatsapp_templates_service_1.whatsAppTemplatesService.replacePlaceholders(message, sampleLead, senderInfo);
            res.status(200).json({ success: true, data: { rendered } });
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error({ err: errMsg }, '[WhatsAppTemplates] previewTemplate error');
            res.status(500).json({ success: false, message: `Failed to preview template: ${errMsg}` });
        }
    }
    async resetTemplates(_req, res, _next) {
        try {
            await whatsapp_templates_service_1.whatsAppTemplatesService.resetToDefaults();
            const templates = await whatsapp_templates_service_1.whatsAppTemplatesService.getTemplates();
            res.status(200).json({
                success: true,
                message: 'Templates reset to defaults successfully',
                data: templates,
            });
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error({ err: errMsg }, '[WhatsAppTemplates] resetTemplates error');
            res.status(500).json({ success: false, message: `Failed to reset templates: ${errMsg}` });
        }
    }
}
exports.WhatsAppTemplateController = WhatsAppTemplateController;
exports.whatsAppTemplateController = new WhatsAppTemplateController();
//# sourceMappingURL=whatsapp-template.controller.js.map