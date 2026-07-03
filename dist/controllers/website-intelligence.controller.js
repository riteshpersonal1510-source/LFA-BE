"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.websiteIntelligenceController = exports.WebsiteIntelligenceController = void 0;
const website_intelligence_service_1 = require("../services/website-intelligence.service");
const audit_concurrency_service_1 = require("../services/audit-concurrency.service");
const audit_cache_service_1 = require("../services/audit-cache.service");
const api_response_1 = require("../utils/api-response");
class WebsiteIntelligenceController {
    async analyzeSingleLead(req, res, next) {
        try {
            const { leadId } = req.params;
            const forceRefresh = req.body?.forceRefresh;
            if (!forceRefresh) {
                const cached = audit_cache_service_1.auditCache.get(`website-intel:${leadId}`);
                if (cached) {
                    api_response_1.APIResponse.success(res, cached, 'Returned cached website intelligence');
                    return;
                }
            }
            if (forceRefresh) {
                audit_cache_service_1.auditCache.invalidate(`website-intel:${leadId}`);
            }
            audit_concurrency_service_1.auditConcurrency.enqueue(leadId, 'website-intelligence', () => website_intelligence_service_1.websiteIntelligenceService.analyzeLead(leadId, { forceRefresh })).catch(() => { });
            api_response_1.APIResponse.success(res, {
                leadId,
                status: 'queued',
                message: 'Website intelligence analysis has been queued. Check lead details for results.',
            }, 'Analysis queued');
        }
        catch (error) {
            next(error);
        }
    }
    async reanalyzeLead(req, res, next) {
        try {
            const { leadId } = req.params;
            audit_cache_service_1.auditCache.invalidate(`website-intel:${leadId}`);
            audit_concurrency_service_1.auditConcurrency.enqueue(leadId, 'website-intelligence', () => website_intelligence_service_1.websiteIntelligenceService.reanalyzeLead(leadId)).catch(() => { });
            api_response_1.APIResponse.success(res, { leadId, status: 'queued' }, 'Re-analysis queued');
        }
        catch (error) {
            next(error);
        }
    }
    async getIntelligenceStats(_req, res, next) {
        try {
            const stats = await website_intelligence_service_1.websiteIntelligenceService.getIntelligenceStats();
            api_response_1.APIResponse.success(res, stats, 'Intelligence stats retrieved');
        }
        catch (error) {
            next(error);
        }
    }
    async analyzeMultipleLeads(req, res, next) {
        try {
            const { leadIds } = req.body;
            if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
                api_response_1.APIResponse.error(res, 'leadIds array is required', undefined, 400);
                return;
            }
            for (const leadId of leadIds.slice(0, 5)) {
                audit_concurrency_service_1.auditConcurrency.enqueue(leadId, 'website-intelligence', () => website_intelligence_service_1.websiteIntelligenceService.analyzeLead(leadId)).catch(() => { });
            }
            api_response_1.APIResponse.success(res, { queued: Math.min(leadIds.length, 5) }, 'Analysis queued');
        }
        catch (error) {
            next(error);
        }
    }
}
exports.WebsiteIntelligenceController = WebsiteIntelligenceController;
exports.websiteIntelligenceController = new WebsiteIntelligenceController();
//# sourceMappingURL=website-intelligence.controller.js.map