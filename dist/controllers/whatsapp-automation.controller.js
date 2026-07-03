"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsAppAutomationController = exports.WhatsAppAutomationController = void 0;
const Lead_1 = require("../models/Lead");
const logger_1 = require("../utils/logger");
const whatsapp_ai_service_1 = require("../services/whatsapp-ai.service");
const lead_statistics_service_1 = require("../services/lead-statistics.service");
const phone_normalizer_service_1 = require("../services/phone-normalizer.service");
class WhatsAppAutomationController {
    async getLeads(req, res, _next) {
        try {
            const page = parseInt(req.query.page?.toString() || '1', 10);
            const limit = parseInt(req.query.limit?.toString() || '50', 10);
            const skip = (page - 1) * limit;
            const query = {};
            query.phone = { $exists: true, $nin: [null, ''] };
            if (req.query.search) {
                const search = req.query.search.toString();
                query.$or = [
                    { companyName: { $regex: search, $options: 'i' } },
                    { phone: { $regex: search, $options: 'i' } },
                    { category: { $regex: search, $options: 'i' } },
                    { searchedCity: { $regex: search, $options: 'i' } },
                ];
            }
            if (req.query.hasWebsite === 'true') {
                query.hasWebsite = true;
            }
            else if (req.query.hasWebsite === 'false') {
                query.$or = [
                    ...(query.$or ? query.$or : []),
                    { hasWebsite: false },
                    { hasWebsite: { $exists: false }, hasRealWebsite: { $ne: true } },
                ];
            }
            if (req.query.reportStatus === 'generated') {
                query['report.generated'] = true;
            }
            else if (req.query.reportStatus === 'not_generated') {
                query['report.generated'] = { $ne: true };
            }
            if (req.query.outreachStatus) {
                const status = req.query.outreachStatus.toString();
                if (status === 'pending') {
                    query.$or = [
                        ...(query.$or ? query.$or : []),
                        { 'whatsappOutreach.status': { $in: ['pending', undefined, null] } },
                    ];
                }
                else {
                    query['whatsappOutreach.status'] = status;
                }
            }
            if (req.query.city) {
                query.searchedCity = { $regex: req.query.city.toString(), $options: 'i' };
            }
            if (req.query.category) {
                query.category = { $regex: req.query.category.toString(), $options: 'i' };
            }
            if (req.query.source) {
                query.source = req.query.source.toString();
            }
            const sortOptions = { createdAt: -1 };
            const [total, leads] = await Promise.all([
                Lead_1.Lead.countDocuments(query),
                Lead_1.Lead.find(query)
                    .select('companyName phone website category searchedCity source hasRealWebsite hasWebsite websitePresence detectedWebsiteType report whatsappOutreach leadScore rating websiteType')
                    .sort(sortOptions)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
            ]);
            const mappedLeads = leads.map((lead) => {
                const rawPhone = lead.phone;
                const { normalizedPhone, isValid, reason } = rawPhone
                    ? phone_normalizer_service_1.phoneNormalizer.normalize(rawPhone)
                    : { normalizedPhone: '', isValid: false, reason: 'No phone number' };
                return {
                    _id: lead._id,
                    id: lead._id.toString(),
                    companyName: lead.companyName,
                    phone: rawPhone || '',
                    normalizedPhone,
                    website: lead.website,
                    category: lead.category,
                    city: lead.searchedCity,
                    source: lead.source,
                    hasWebsite: typeof lead.hasWebsite === 'boolean' ? lead.hasWebsite : false,
                    websitePresence: lead.websitePresence || (lead.hasWebsite ? 'YES' : 'NO'),
                    detectedWebsiteType: lead.detectedWebsiteType,
                    websiteType: lead.websiteType,
                    report: lead.report,
                    whatsappOutreach: lead.whatsappOutreach || {
                        status: 'pending', notes: '', campaignId: null,
                        lastOpenedAt: null, lastSentAt: null, templateType: null,
                        lastError: null, outreachAttemptCount: 0, queuePosition: null,
                    },
                    leadScore: lead.leadScore,
                    rating: lead.rating,
                    phoneValid: isValid,
                    validationReason: reason,
                };
            });
            res.status(200).json({
                success: true,
                data: mappedLeads,
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
            });
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error({ err: errMsg }, '[WhatsAppAutomation] getLeads error');
            res.status(500).json({ success: false, message: `Failed to fetch leads: ${errMsg}` });
        }
    }
    async generateMessages(req, res, _next) {
        try {
            const { leadIds } = req.body;
            if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
                res.status(400).json({ success: false, message: 'leadIds array is required' });
                return;
            }
            res.status(202).json({
                success: true,
                message: 'Message generation queued',
                total: leadIds.length,
            });
            setImmediate(async () => {
                try {
                    const result = await whatsapp_ai_service_1.whatsAppAIService.generateMessages(leadIds);
                    logger_1.logger.info({ total: result.total, skippedCount: result.skippedCount }, '[WhatsAppAutomation] messages generated via Python AI Service');
                }
                catch (err) {
                    logger_1.logger.error({ err: err instanceof Error ? err.message : String(err) }, '[WhatsAppAutomation] background message generation failed');
                }
            });
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error({ err: errMsg }, '[WhatsAppAutomation] generateMessages error');
            if (!res.headersSent) {
                res.status(500).json({ success: false, message: `Failed to queue message generation: ${errMsg}` });
            }
        }
    }
    async trackOutreachAction(req, res, _next) {
        try {
            const { leadId, action, notes, error: actionError } = req.body;
            if (!leadId || !action) {
                res.status(400).json({ success: false, message: 'leadId and action are required' });
                return;
            }
            const updateData = {
                'whatsappOutreach.status': action,
            };
            if (action === 'manually_sent') {
                updateData['whatsappOutreach.lastSentAt'] = new Date().toISOString();
                updateData['whatsappOutreach.outreachAttemptCount'] = 0;
            }
            if (action === 'failed' || actionError) {
                updateData['whatsappOutreach.lastError'] = actionError || notes || 'Unknown error';
                updateData['whatsappOutreach.outreachAttemptCount'] = 1;
            }
            if (notes) {
                updateData['whatsappOutreach.notes'] = notes;
            }
            await Lead_1.Lead.findByIdAndUpdate(leadId, { $set: updateData });
            logger_1.logger.info({ leadId, action }, '[WhatsAppAutomation] outreach action tracked');
            res.status(200).json({ success: true, message: 'Outreach action tracked' });
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error({ err: errMsg }, '[WhatsAppAutomation] trackOutreachAction error');
            res.status(500).json({ success: false, message: `Failed to track action: ${errMsg}` });
        }
    }
    async getStats(_req, res, _next) {
        try {
            const stats = await lead_statistics_service_1.leadStatisticsService.getLeadStatistics();
            logger_1.logger.info({
                total: stats.totalLeads,
                withPhone: stats.withPhoneCount,
                withWebsite: stats.websiteCount,
                pending: stats.pendingCount,
                sent: stats.sentCount,
            }, '[WhatsAppAutomation] getStats using shared statistics service');
            res.status(200).json({
                success: true,
                data: {
                    total: stats.totalLeads,
                    withWebsite: stats.websiteCount,
                    pending: stats.pendingCount,
                    prepared: stats.preparedCount,
                    manually_sent: stats.sentCount,
                    skipped: stats.skippedCount,
                    failed: stats.failedCount,
                },
            });
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error({ err: errMsg }, '[WhatsAppAutomation] getStats error');
            res.status(500).json({ success: false, message: `Failed to get stats: ${errMsg}` });
        }
    }
    async bulkUpdateStatus(req, res, _next) {
        try {
            const { leadIds, status } = req.body;
            if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0 || !status) {
                res.status(400).json({ success: false, message: 'leadIds array and status are required' });
                return;
            }
            const updateData = {
                'whatsappOutreach.status': status,
            };
            if (status === 'manually_sent') {
                updateData['whatsappOutreach.lastSentAt'] = new Date().toISOString();
            }
            const result = await Lead_1.Lead.updateMany({ _id: { $in: leadIds } }, { $set: updateData });
            logger_1.logger.info({ modifiedCount: result.modifiedCount, status }, '[WhatsAppAutomation] bulk status update');
            res.status(200).json({
                success: true,
                message: `Updated ${result.modifiedCount} leads`,
                modifiedCount: result.modifiedCount,
            });
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error({ err: errMsg }, '[WhatsAppAutomation] bulkUpdateStatus error');
            res.status(500).json({ success: false, message: `Failed to bulk update: ${errMsg}` });
        }
    }
}
exports.WhatsAppAutomationController = WhatsAppAutomationController;
exports.whatsAppAutomationController = new WhatsAppAutomationController();
//# sourceMappingURL=whatsapp-automation.controller.js.map