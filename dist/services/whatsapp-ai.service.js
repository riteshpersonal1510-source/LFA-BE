"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsAppAIService = exports.WhatsAppAIService = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_SERVICE_TIMEOUT = parseInt(process.env.AI_SERVICE_TIMEOUT || '60000', 10);
class WhatsAppAIService {
    constructor() {
        this.client = axios_1.default.create({
            baseURL: `${AI_SERVICE_URL}/api/v1`,
            timeout: AI_SERVICE_TIMEOUT,
            headers: { 'Content-Type': 'application/json' },
        });
        this.client.interceptors.request.use((config) => {
            logger_1.logger.info({ url: config.url, method: config.method }, '[WhatsAppAI] Request');
            return config;
        }, (error) => {
            logger_1.logger.error({ err: error.message }, '[WhatsAppAI] Request error');
            return Promise.reject(error);
        });
        this.client.interceptors.response.use((response) => {
            logger_1.logger.info({ url: response.config.url, status: response.status }, '[WhatsAppAI] Response');
            return response;
        }, (error) => {
            logger_1.logger.error({ err: error.message, url: error.config?.url }, '[WhatsAppAI] Response error');
            return Promise.reject(error);
        });
    }
    async checkHealth() {
        logger_1.logger.info('[WhatsAppAI] Checking AI Service health');
        try {
            await this.client.get('/health');
            return {
                success: true,
                status: 'healthy',
                url: AI_SERVICE_URL,
            };
        }
        catch (error) {
            logger_1.logger.error({ err: error.message }, '[WhatsAppAI] Health check failed');
            return {
                success: false,
                status: 'unhealthy',
                url: AI_SERVICE_URL,
            };
        }
    }
    async startCampaign(leadIds) {
        logger_1.logger.info({ leadCount: leadIds.length }, '[WhatsAppAI] Starting campaign');
        try {
            if (!leadIds || leadIds.length === 0) {
                const err = new Error('No leads selected');
                err.statusCode = 400;
                err.code = 'NO_LEADS_SELECTED';
                throw err;
            }
            const response = await this.client.post('/whatsapp/start-campaign', { leadIds });
            const data = response.data;
            logger_1.logger.info({ sessionId: data.sessionId, status: data.status, totalLeads: data.totalLeads }, '[WhatsAppAI] Campaign started');
            return {
                sessionId: data.sessionId || '',
                status: data.status || 'created',
                totalLeads: data.totalLeads || 0,
                completed: data.completed || 0,
                failed: data.failed || 0,
                currentLead: data.currentLead || '',
            };
        }
        catch (error) {
            const statusCode = error.response?.status || error.statusCode || 500;
            const responseData = error.response?.data || {};
            const message = responseData.message || error.message || 'Campaign failed to start';
            const errorCode = responseData.error_code || error.code || 'CAMPAIGN_START_FAILED';
            if (statusCode === 422) {
                logger_1.logger.warn({ status: statusCode, message, code: errorCode }, '[WhatsAppAI] Validation error');
                const err = new Error(message);
                err.statusCode = 422;
                err.code = errorCode;
                throw err;
            }
            if (statusCode === 400) {
                logger_1.logger.warn({ status: statusCode, message, code: errorCode }, '[WhatsAppAI] Bad request');
                const err = new Error(message);
                err.statusCode = 400;
                err.code = errorCode;
                throw err;
            }
            if (statusCode && statusCode !== 500) {
                logger_1.logger.warn({ status: statusCode, message, code: errorCode }, '[WhatsAppAI] API error');
                const err = new Error(message);
                err.statusCode = statusCode;
                err.code = errorCode;
                throw err;
            }
            logger_1.logger.error({ message: error.message, code: error.code, statusCode }, '[WhatsAppAI] Campaign start failed');
            throw new Error(message || 'Failed to start campaign');
        }
    }
    async getSessionStatus(sessionId) {
        logger_1.logger.info({ sessionId }, '[WhatsAppAI] Fetching session status');
        try {
            const response = await this.client.get(`/whatsapp/sessions/${sessionId}/status`);
            const data = response.data;
            logger_1.logger.info({ sessionId: data.sessionId, status: data.status, processed: data.processed, totalLeads: data.totalLeads }, '[WhatsAppAI] Session status retrieved');
            return {
                sessionId: data.sessionId || sessionId,
                status: data.status || 'unknown',
                totalLeads: data.totalLeads || 0,
                completed: data.completed || 0,
                failed: data.failed || 0,
                currentLead: data.currentLead || null,
                currentLeadIndex: data.currentLeadIndex || 0,
                currentStep: data.currentStep || '',
                error: data.error || null,
                eta: data.eta || null,
                elapsedSeconds: data.elapsedSeconds || 0,
                processed: data.processed || 0,
                remaining: data.remaining || 0,
                leads: data.leads || [],
                createdAt: data.createdAt || Date.now(),
                completedAt: data.completedAt || null,
            };
        }
        catch (error) {
            logger_1.logger.error({ sessionId, message: error.message }, '[WhatsAppAI] Failed to get session status');
            throw error;
        }
    }
    async stopCampaign(sessionId) {
        logger_1.logger.info({ sessionId }, '[WhatsAppAI] Stopping campaign');
        try {
            const response = await this.client.post(`/whatsapp/sessions/${sessionId}/stop`);
            const data = response.data;
            logger_1.logger.info({ sessionId: data.sessionId, status: data.status }, '[WhatsAppAI] Campaign stopped');
            return {
                sessionId: data.sessionId || sessionId,
                status: data.status || 'stopped',
            };
        }
        catch (error) {
            logger_1.logger.error({ sessionId, message: error.message }, '[WhatsAppAI] Failed to stop campaign');
            throw error;
        }
    }
    async generateMessages(leadIds, campaignId = 'default') {
        logger_1.logger.info({ leadCount: leadIds.length, campaignId }, '[WhatsAppAI] Generating messages via Python');
        try {
            const response = await this.client.post('/whatsapp/generate', { leadIds, campaignId });
            const data = response.data;
            logger_1.logger.info({ total: data.total, skippedCount: data.skippedCount, campaignId }, '[WhatsAppAI] Messages generated');
            return data;
        }
        catch (error) {
            logger_1.logger.error({ campaignId, message: error.message }, '[WhatsAppAI] Failed to generate messages');
            throw error;
        }
    }
}
exports.WhatsAppAIService = WhatsAppAIService;
exports.whatsAppAIService = new WhatsAppAIService();
//# sourceMappingURL=whatsapp-ai.service.js.map