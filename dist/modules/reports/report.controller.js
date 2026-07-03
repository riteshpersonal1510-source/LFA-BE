"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportController = exports.ReportController = void 0;
const Lead_1 = require("../../models/Lead");
const report_service_1 = require("./report.service");
const report_queue_1 = require("./report.queue");
const logger_1 = require("../../utils/logger");
const api_response_1 = require("../../utils/api-response");
class ReportController {
    async generateReport(req, res, next) {
        try {
            const { leadId } = req.params;
            if (!leadId) {
                api_response_1.APIResponse.error(res, 'Lead ID is required', null, 400);
                return;
            }
            const lead = await Lead_1.Lead.findById(leadId).select('_id companyName').lean();
            if (!lead) {
                api_response_1.APIResponse.error(res, 'Lead not found', null, 404);
                return;
            }
            report_queue_1.reportQueue.enqueue(leadId).then((result) => {
                logger_1.logger.info({ leadId, result }, '[ReportController] Report generation completed');
            }).catch((err) => {
                logger_1.logger.error({ err: err instanceof Error ? err.message : String(err), leadId }, '[ReportController] Report generation failed');
            });
            api_response_1.APIResponse.success(res, {
                leadId,
                status: 'queued',
                message: 'Report generation has been queued. Check status via GET /reports/status/:leadId',
            }, 'Report generation started');
        }
        catch (error) {
            next(error);
        }
    }
    async getReportStatus(req, res, next) {
        try {
            const { leadId } = req.params;
            if (!leadId) {
                api_response_1.APIResponse.error(res, 'Lead ID is required', null, 400);
                return;
            }
            const status = await report_service_1.reportService.getReportStatus(leadId);
            if (!status.exists) {
                api_response_1.APIResponse.error(res, 'Lead not found', null, 404);
                return;
            }
            api_response_1.APIResponse.success(res, {
                leadId,
                report: status.report,
                isQueued: report_queue_1.reportQueue.isQueued(leadId),
            }, 'Report status fetched');
        }
        catch (error) {
            next(error);
        }
    }
    async viewReport(req, res, next) {
        try {
            const { leadId } = req.params;
            if (!leadId) {
                api_response_1.APIResponse.error(res, 'Lead ID is required', null, 400);
                return;
            }
            const data = await report_service_1.reportService.getReportData(leadId);
            if (!data.html) {
                api_response_1.APIResponse.error(res, 'Report not found or not yet generated', null, 404);
                return;
            }
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(data.html);
        }
        catch (error) {
            next(error);
        }
    }
    async downloadReport(req, res, next) {
        try {
            const { leadId } = req.params;
            if (!leadId) {
                api_response_1.APIResponse.error(res, 'Lead ID is required', null, 400);
                return;
            }
            const data = await report_service_1.reportService.getReportData(leadId);
            if (!data.pdf) {
                api_response_1.APIResponse.error(res, 'PDF report not found or not yet generated', null, 404);
                return;
            }
            const leadDoc = await Lead_1.Lead.findById(leadId).select('companyName').lean();
            const companyName = leadDoc?.companyName || leadId;
            const filename = `audit_report_${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(data.pdf);
        }
        catch (error) {
            next(error);
        }
    }
    async deleteReport(req, res, next) {
        try {
            const { leadId } = req.params;
            if (!leadId) {
                api_response_1.APIResponse.error(res, 'Lead ID is required', null, 400);
                return;
            }
            const deleted = await report_service_1.reportService.deleteReport(leadId);
            if (!deleted) {
                api_response_1.APIResponse.error(res, 'Report not found', null, 404);
                return;
            }
            api_response_1.APIResponse.success(res, null, 'Report deleted successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async getReportProgress(req, res, next) {
        try {
            const { leadId } = req.params;
            if (!leadId) {
                api_response_1.APIResponse.error(res, 'Lead ID is required', null, 400);
                return;
            }
            const status = await report_service_1.reportService.getReportStatus(leadId);
            if (!status.exists) {
                api_response_1.APIResponse.error(res, 'Lead not found', null, 404);
                return;
            }
            api_response_1.APIResponse.success(res, {
                leadId,
                progress: status.report?.progress || null,
                generating: status.report?.generating || false,
                generated: status.report?.generated || false,
                isQueued: report_queue_1.reportQueue.isQueued(leadId),
            }, 'Report progress fetched');
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ReportController = ReportController;
exports.reportController = new ReportController();
//# sourceMappingURL=report.controller.js.map