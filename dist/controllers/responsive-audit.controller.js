"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.responsiveAuditController = exports.ResponsiveAuditController = void 0;
const responsive_audit_service_1 = require("../services/responsive-audit.service");
const audit_concurrency_service_1 = require("../services/audit-concurrency.service");
const audit_cache_service_1 = require("../services/audit-cache.service");
const logger_1 = require("../utils/logger");
class ResponsiveAuditController {
    async auditSingleLead(req, res) {
        try {
            const { leadId } = req.params;
            const { timeout, skipScreenshots, screenshotQuality } = req.body;
            const cached = audit_cache_service_1.auditCache.get(`responsive:${leadId}`);
            if (cached) {
                res.status(200).json({
                    success: true,
                    message: 'Returned cached responsive audit',
                    data: cached,
                });
                return;
            }
            audit_concurrency_service_1.auditConcurrency.enqueue(leadId, 'responsive-audit', () => responsive_audit_service_1.responsiveAuditService.auditLead(leadId, { timeout, skipScreenshots, screenshotQuality })).catch((err) => {
                logger_1.logger.error({ err: err instanceof Error ? err.message : String(err), leadId }, 'Background responsive audit failed');
            });
            res.status(202).json({
                success: true,
                message: 'Responsive audit has been queued. Check lead details for results.',
                data: { leadId, status: 'queued' },
            });
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'Audit single lead error:');
            res.status(500).json({ success: false, message: 'Failed to queue audit' });
        }
    }
    async auditMultipleLeads(req, res) {
        try {
            const { leadIds, timeout, skipScreenshots, screenshotQuality } = req.body;
            if (!Array.isArray(leadIds) || leadIds.length === 0) {
                res.status(400).json({ success: false, message: 'leadIds array is required' });
                return;
            }
            for (const leadId of leadIds.slice(0, 5)) {
                audit_concurrency_service_1.auditConcurrency.enqueue(leadId, 'responsive-audit', () => responsive_audit_service_1.responsiveAuditService.auditLead(leadId, { timeout, skipScreenshots, screenshotQuality })).catch((err) => {
                    logger_1.logger.error({ err: err instanceof Error ? err.message : String(err), leadId }, 'Bulk responsive audit failed');
                });
            }
            res.status(202).json({
                success: true,
                message: `${Math.min(leadIds.length, 5)} leads queued for responsive audit.`,
            });
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'Audit multiple leads error:');
            res.status(500).json({ success: false, message: 'Failed to queue audits' });
        }
    }
    async auditLeadsWithoutAudit(_req, res) {
        res.status(202).json({
            success: true,
            message: 'Audit pending leads has been queued.',
        });
    }
    async getAuditStats(_req, res) {
        try {
            const stats = await responsive_audit_service_1.responsiveAuditService.getAuditStats();
            res.status(200).json({ success: true, message: 'Audit statistics retrieved', data: stats });
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'Get audit stats error:');
            res.status(500).json({ success: false, message: 'Failed to get audit statistics' });
        }
    }
    async reauditLead(req, res) {
        try {
            const { leadId } = req.params;
            const { timeout, skipScreenshots, screenshotQuality } = req.body;
            audit_cache_service_1.auditCache.invalidate(`responsive:${leadId}`);
            audit_concurrency_service_1.auditConcurrency.enqueue(leadId, 'responsive-audit', () => responsive_audit_service_1.responsiveAuditService.reauditLead(leadId, { timeout, skipScreenshots, screenshotQuality })).catch((err) => {
                logger_1.logger.error({ err: err instanceof Error ? err.message : String(err), leadId }, 'Background re-audit failed');
            });
            res.status(202).json({
                success: true,
                message: 'Re-audit has been queued.',
                data: { leadId, status: 'queued' },
            });
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'Re-audit lead error:');
            res.status(500).json({ success: false, message: 'Failed to queue re-audit' });
        }
    }
}
exports.ResponsiveAuditController = ResponsiveAuditController;
exports.responsiveAuditController = new ResponsiveAuditController();
//# sourceMappingURL=responsive-audit.controller.js.map