"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const whatsapp_ai_service_1 = require("../services/whatsapp-ai.service");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
router.post('/start-campaign', async (req, res, _next) => {
    try {
        const { leadIds } = req.body;
        if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
            logger_1.logger.warn('[WhatsAppAI] start-campaign called without valid leadIds');
            res.status(400).json({
                success: false,
                message: 'leadIds must be a non-empty array',
                error: 'INVALID_LEADS_ARRAY',
                code: 'INVALID_LEADS_ARRAY'
            });
            return;
        }
        const result = await whatsapp_ai_service_1.whatsAppAIService.startCampaign(leadIds);
        res.status(200).json({ success: true, data: result });
    }
    catch (error) {
        const statusCode = error.statusCode || 500;
        const errorCode = error.code || 'CAMPAIGN_START_FAILED';
        const message = error.message || 'Failed to start campaign';
        logger_1.logger.error({ statusCode, errorCode, message, leadIds: req.body?.leadIds?.length || 0 }, '[WhatsAppAI] start-campaign error');
        res.status(statusCode).json({
            success: false,
            message,
            error: errorCode,
            code: errorCode
        });
    }
});
router.get('/campaign-status/:sessionId', async (req, res, _next) => {
    try {
        const { sessionId } = req.params;
        const result = await whatsapp_ai_service_1.whatsAppAIService.getSessionStatus(sessionId);
        res.status(200).json({ success: true, data: result });
    }
    catch (error) {
        const statusCode = error.statusCode || error.response?.status || 500;
        const message = error.message || 'Failed to get session status';
        logger_1.logger.error({ statusCode, message }, '[WhatsAppAI] campaign-status error');
        res.status(statusCode).json({ success: false, message });
    }
});
router.post('/stop-campaign/:sessionId', async (req, res, _next) => {
    try {
        const { sessionId } = req.params;
        const result = await whatsapp_ai_service_1.whatsAppAIService.stopCampaign(sessionId);
        res.status(200).json({ success: true, data: result });
    }
    catch (error) {
        const statusCode = error.statusCode || error.response?.status || 500;
        const message = error.message || 'Failed to stop campaign';
        logger_1.logger.error({ statusCode, message }, '[WhatsAppAI] stop-campaign error');
        res.status(statusCode).json({ success: false, message });
    }
});
exports.default = router;
//# sourceMappingURL=whatsapp-ai-bridge.route.js.map