"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.outreachController = void 0;
const outreach_service_1 = require("../services/outreach.service");
const audit_concurrency_service_1 = require("../services/audit-concurrency.service");
const audit_cache_service_1 = require("../services/audit-cache.service");
const api_response_1 = require("../utils/api-response");
const logger_1 = require("../utils/logger");
exports.outreachController = {
    async generateForLead(req, res) {
        try {
            const { leadId } = req.params;
            const cached = audit_cache_service_1.auditCache.get(`outreach:${leadId}`);
            if (cached) {
                api_response_1.APIResponse.success(res, cached, 'Returned cached outreach data');
                return;
            }
            audit_concurrency_service_1.auditConcurrency.enqueue(leadId, 'outreach', () => outreach_service_1.outreachService.generateOutreachForLead(leadId).then(r => {
                if (r.data)
                    audit_cache_service_1.auditCache.set(`outreach:${leadId}`, r.data);
                return r;
            })).catch((err) => {
                logger_1.logger.error({ err: err instanceof Error ? err.message : String(err), leadId }, 'Background outreach generation failed');
            });
            api_response_1.APIResponse.success(res, {
                leadId,
                status: 'queued',
                message: 'Outreach generation has been queued. Results will appear when ready.',
            }, 'Outreach queued');
        }
        catch (error) {
            api_response_1.APIResponse.error(res, error.message || 'Failed to queue outreach', null, 500);
        }
    },
    async getLeadOutreach(req, res) {
        try {
            const { leadId } = req.params;
            const data = await outreach_service_1.outreachService.getLeadOutreach(leadId);
            api_response_1.APIResponse.success(res, data, 'Outreach data fetched successfully');
        }
        catch (error) {
            api_response_1.APIResponse.error(res, error.message || 'Failed to get outreach data', null, 500);
        }
    },
    async updateStatus(req, res) {
        try {
            const { leadId } = req.params;
            const { status } = req.body;
            if (!status) {
                api_response_1.APIResponse.error(res, 'status is required', null, 400);
                return;
            }
            const result = await outreach_service_1.outreachService.updateOutreachStatus(leadId, status);
            api_response_1.APIResponse.success(res, result, 'Outreach status updated successfully');
        }
        catch (error) {
            api_response_1.APIResponse.error(res, error.message || 'Failed to update outreach status', null, 500);
        }
    },
    async generateForMultipleLeads(req, res) {
        try {
            const { leadIds } = req.body;
            if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
                api_response_1.APIResponse.error(res, 'leadIds array is required', null, 400);
                return;
            }
            for (const leadId of leadIds.slice(0, 5)) {
                audit_concurrency_service_1.auditConcurrency.enqueue(leadId, 'outreach', () => outreach_service_1.outreachService.generateOutreachForLead(leadId)).catch((err) => {
                    logger_1.logger.error({ err: err instanceof Error ? err.message : String(err), leadId }, 'Bulk outreach failed');
                });
            }
            api_response_1.APIResponse.success(res, { queued: Math.min(leadIds.length, 5) }, 'Bulk outreach queued');
        }
        catch (error) {
            api_response_1.APIResponse.error(res, error.message || 'Failed to queue bulk outreach', null, 500);
        }
    },
    async generateForPendingLeads(_req, res) {
        api_response_1.APIResponse.success(res, { status: 'queued' }, 'Pending outreach queued');
    },
    async getStats(_req, res) {
        try {
            const stats = await outreach_service_1.outreachService.getOutreachStats();
            api_response_1.APIResponse.success(res, stats, 'Outreach statistics retrieved');
        }
        catch (error) {
            api_response_1.APIResponse.error(res, error.message || 'Failed to get outreach stats', null, 500);
        }
    },
};
//# sourceMappingURL=outreach.controller.js.map