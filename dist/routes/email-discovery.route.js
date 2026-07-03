"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const business_email_discovery_service_1 = require("../services/business-email-discovery.service");
const Lead_1 = require("../models/Lead");
const error_handler_1 = require("../utils/error-handler");
const api_response_1 = require("../utils/api-response");
const zod_1 = require("zod");
const validations_1 = require("../utils/validations");
const router = (0, express_1.Router)();
const discoverSchema = zod_1.z.object({
    params: zod_1.z.object({
        leadId: zod_1.z.string().min(1, 'leadId is required'),
    }),
});
const backfillSchema = zod_1.z.object({
    body: zod_1.z.object({
        concurrency: zod_1.z.number().min(1).max(20).optional().default(5),
    }),
});
router.post('/:leadId', (0, validations_1.validate)(discoverSchema), (0, error_handler_1.asyncHandler)(async (req, res, _next) => {
    const { leadId } = req.params;
    const lead = await Lead_1.Lead.findById(leadId);
    if (!lead) {
        return api_response_1.APIResponse.error(res, 'Lead not found', null, 404);
    }
    const asyncMode = req.query.async === 'true';
    if (asyncMode) {
        await Lead_1.Lead.findByIdAndUpdate(leadId, {
            $set: { emailDiscoveryStatus: 'scanning' },
        });
        business_email_discovery_service_1.businessEmailDiscoveryService.discoverEmailsForLeadAsync(leadId);
        return api_response_1.APIResponse.success(res, {
            status: 'scanning',
            message: 'Email discovery started in background',
        }, 'Email discovery initiated');
    }
    const result = await business_email_discovery_service_1.businessEmailDiscoveryService.discoverEmailsForLead(leadId);
    if (result.success) {
        return api_response_1.APIResponse.success(res, result, 'Email discovery completed');
    }
    return api_response_1.APIResponse.error(res, result.error || 'Email discovery failed', null, 500);
}));
router.get('/:leadId/result', (0, validations_1.validate)(discoverSchema), (0, error_handler_1.asyncHandler)(async (req, res, _next) => {
    const { leadId } = req.params;
    const lead = await Lead_1.Lead.findById(leadId).select('discoveredEmails primaryEmail emailCount emailDiscoveryStatus emailDiscoveryError lastEmailScan');
    if (!lead) {
        return api_response_1.APIResponse.error(res, 'Lead not found', null, 404);
    }
    return api_response_1.APIResponse.success(res, {
        discoveredEmails: lead.discoveredEmails || [],
        primaryEmail: lead.primaryEmail || '',
        emailCount: lead.emailCount || 0,
        status: lead.emailDiscoveryStatus || 'pending',
        error: lead.emailDiscoveryError || null,
        lastEmailScan: lead.lastEmailScan || null,
    }, 'Email discovery status');
}));
router.post('/backfill/start', (0, validations_1.validate)(backfillSchema), (0, error_handler_1.asyncHandler)(async (req, res, _next) => {
    const concurrency = req.body.concurrency || 5;
    setImmediate(async () => {
        try {
            await business_email_discovery_service_1.businessEmailDiscoveryService.backfillAllLeads(concurrency);
        }
        catch (_error) {
        }
    });
    return api_response_1.APIResponse.success(res, { message: 'Backfill started in background' }, 'Backfill initiated');
}));
router.get('/backfill/status', (0, error_handler_1.asyncHandler)(async (_req, res, _next) => {
    const pending = await Lead_1.Lead.countDocuments({
        hasWebsite: true,
        website: { $exists: true, $nin: ['', null] },
        $or: [
            { emailDiscoveryStatus: { $in: ['pending', 'failed', null] } },
            { emailDiscoveryStatus: { $exists: false } },
        ],
    });
    const completed = await Lead_1.Lead.countDocuments({
        emailDiscoveryStatus: 'completed',
    });
    const failed = await Lead_1.Lead.countDocuments({
        emailDiscoveryStatus: 'failed',
    });
    const totalWithWebsite = await Lead_1.Lead.countDocuments({
        hasWebsite: true,
        website: { $exists: true, $nin: ['', null] },
    });
    return api_response_1.APIResponse.success(res, { pending, completed, failed, total: totalWithWebsite }, 'Backfill status');
}));
exports.default = router;
//# sourceMappingURL=email-discovery.route.js.map