"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportService = exports.ReportService = void 0;
const Lead_1 = require("../../models/Lead");
const logger_1 = require("../../utils/logger");
const report_generator_1 = require("./report.generator");
const report_template_1 = require("./report.template");
const report_pdf_1 = require("./report.pdf");
const report_storage_1 = require("./report.storage");
const website_analysis_service_1 = require("../../services/website-analysis.service");
const REPORT_VERSION = '1.0.0';
function getDefaultReportData() {
    return {
        generated: false,
        generating: false,
        generatedAt: null,
        reportUrl: null,
        reportPath: null,
        htmlPath: null,
        score: null,
        reportVersion: null,
        lastAuditAt: null,
        progress: null,
        failureReason: null,
    };
}
class ReportService {
    constructor() {
        this.generationLocks = new Set();
    }
    async generateReport(leadId) {
        if (this.generationLocks.has(leadId)) {
            return {
                success: false,
                reportUrl: null,
                reportPath: null,
                htmlPath: null,
                score: null,
                message: 'Report generation already in progress for this lead',
                generatedAt: new Date().toISOString(),
            };
        }
        const existingStatus = await this.getReportStatus(leadId);
        if (existingStatus.report?.generated && existingStatus.report.reportPath) {
            return {
                success: true,
                reportUrl: existingStatus.report.reportUrl,
                reportPath: existingStatus.report.reportPath,
                htmlPath: existingStatus.report.htmlPath,
                score: existingStatus.report.score,
                message: 'Report already generated',
                generatedAt: existingStatus.report.generatedAt || new Date().toISOString(),
            };
        }
        this.generationLocks.add(leadId);
        logger_1.logger.info('[Report] Report Started');
        try {
            await Lead_1.Lead.findByIdAndUpdate(leadId, {
                'report.generating': true,
                'report.progress': { stage: 'initializing', percent: 0, message: 'Starting report generation...' },
            });
            const lead = await Lead_1.Lead.findById(leadId).lean();
            if (!lead) {
                throw new Error('Lead not found');
            }
            await Lead_1.Lead.findByIdAndUpdate(leadId, {
                'report.progress': { stage: 'collecting_audit', percent: 15, message: 'Collecting audit data...' },
            });
            const summary = (0, report_generator_1.buildAuditSummary)(lead);
            await Lead_1.Lead.findByIdAndUpdate(leadId, {
                'report.progress': { stage: 'rendering_report', percent: 40, message: 'Rendering report...' },
            });
            const html = (0, report_template_1.buildReportHtml)(summary);
            const htmlPath = await report_storage_1.reportStorage.saveHtml(leadId, html);
            await Lead_1.Lead.findByIdAndUpdate(leadId, {
                'report.progress': { stage: 'generating_pdf', percent: 65, message: 'Generating PDF...' },
            });
            const pdfBuffer = await report_pdf_1.reportPdfEngine.generatePdf(html);
            const pdfPath = await report_storage_1.reportStorage.savePdf(leadId, pdfBuffer);
            const reportUrl = report_storage_1.reportStorage.getPdfUrl(pdfPath);
            const score = summary.responsiveAudit.score ?? summary.leadScore;
            await Lead_1.Lead.findByIdAndUpdate(leadId, {
                'report.generated': true,
                'report.generating': false,
                'report.generatedAt': new Date(),
                'report.reportUrl': reportUrl,
                'report.reportPath': pdfPath,
                'report.htmlPath': htmlPath,
                'report.score': score,
                'report.reportVersion': REPORT_VERSION,
                'report.lastAuditAt': new Date(),
                'report.progress': { stage: 'complete', percent: 100, message: 'Report generated successfully' },
                'report.failureReason': null,
            });
            logger_1.logger.info({ leadId, score, reportUrl }, '[ReportService] Report generated successfully');
            return {
                success: true,
                reportUrl,
                reportPath: pdfPath,
                htmlPath,
                score,
                message: 'Report generated successfully',
                generatedAt: new Date().toISOString(),
            };
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            logger_1.logger.error({ err: errMsg, leadId }, '[ReportService] Report generation failed');
            await Lead_1.Lead.findByIdAndUpdate(leadId, {
                'report.generated': false,
                'report.generating': false,
                'report.failureReason': errMsg,
                'report.progress': { stage: 'error', percent: 0, message: `Failed: ${errMsg}` },
            });
            return {
                success: false,
                reportUrl: null,
                reportPath: null,
                htmlPath: null,
                score: null,
                message: `Report generation failed: ${errMsg}`,
                generatedAt: new Date().toISOString(),
            };
        }
        finally {
            this.generationLocks.delete(leadId);
        }
    }
    async getReportStatus(leadId) {
        const doc = await Lead_1.Lead.findById(leadId).select('report').lean();
        if (!doc) {
            return { exists: false, report: null };
        }
        const lead = doc;
        return { exists: true, report: lead.report || getDefaultReportData() };
    }
    async getReportData(leadId) {
        const status = await this.getReportStatus(leadId);
        if (!status.report?.generated || !status.report.htmlPath) {
            return { html: null, pdf: null, report: status.report };
        }
        const html = await report_storage_1.reportStorage.getHtml(status.report.htmlPath);
        const pdf = status.report.reportPath ? await report_storage_1.reportStorage.getPdf(status.report.reportPath) : null;
        return { html, pdf, report: status.report };
    }
    async deleteReport(leadId) {
        const status = await this.getReportStatus(leadId);
        if (!status.report)
            return false;
        if (status.report.reportPath) {
            await report_storage_1.reportStorage.deleteReport(status.report.reportPath);
        }
        if (status.report.htmlPath) {
            await report_storage_1.reportStorage.deleteReport(status.report.htmlPath);
        }
        await Lead_1.Lead.findByIdAndUpdate(leadId, {
            report: getDefaultReportData(),
        });
        return true;
    }
    async triggerAutoGeneration(leadId) {
        try {
            const doc = await Lead_1.Lead.findById(leadId).select('report website hasRealWebsite websiteType analysisEligible').lean();
            if (!doc)
                return;
            const lead = doc;
            if (lead.report?.generated)
                return;
            const analysis = lead.analysisEligible
                ? { analysisEligible: true }
                : website_analysis_service_1.websiteAnalysisService.resolveLead(lead);
            if (!analysis.analysisEligible)
                return;
            logger_1.logger.info('[Report] Report Started — auto-gen queued');
            const { reportQueue } = await Promise.resolve().then(() => __importStar(require('./report.queue')));
            reportQueue.enqueue(leadId).catch((err) => {
                logger_1.logger.error({ err: err instanceof Error ? err.message : String(err), leadId }, '[ReportService] Auto-generation failed');
            });
        }
        catch (error) {
            logger_1.logger.error({ err: error instanceof Error ? error.message : String(error), leadId }, '[ReportService] Auto-generation error');
        }
    }
}
exports.ReportService = ReportService;
exports.reportService = new ReportService();
//# sourceMappingURL=report.service.js.map