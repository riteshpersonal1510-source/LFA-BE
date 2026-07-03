"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportStorage = exports.ReportStorage = void 0;
const promises_1 = require("fs/promises");
const path_1 = require("path");
const logger_1 = require("../../utils/logger");
const UPLOADS_ROOT = (0, path_1.join)(process.cwd(), 'uploads', 'reports');
class ReportStorage {
    async ensureDir(dir) {
        try {
            await (0, promises_1.mkdir)(dir, { recursive: true });
        }
        catch (err) {
            if (err.code !== 'EEXIST')
                throw err;
        }
    }
    async savePdf(leadId, pdfBuffer) {
        const dir = (0, path_1.join)(UPLOADS_ROOT, 'pdf');
        await this.ensureDir(dir);
        const filename = `${leadId}_${Date.now()}.pdf`;
        const filepath = (0, path_1.join)(dir, filename);
        await (0, promises_1.writeFile)(filepath, pdfBuffer);
        logger_1.logger.info({ leadId, filepath }, '[ReportStorage] PDF saved');
        return filepath;
    }
    async saveHtml(leadId, html) {
        const dir = (0, path_1.join)(UPLOADS_ROOT, 'html');
        await this.ensureDir(dir);
        const filename = `${leadId}_${Date.now()}.html`;
        const filepath = (0, path_1.join)(dir, filename);
        await (0, promises_1.writeFile)(filepath, html, 'utf-8');
        logger_1.logger.info({ leadId, filepath }, '[ReportStorage] HTML saved');
        return filepath;
    }
    async saveScreenshot(leadId, type, buffer) {
        const dir = (0, path_1.join)(UPLOADS_ROOT, 'screenshots');
        await this.ensureDir(dir);
        const filename = `${leadId}_${type}_${Date.now()}.png`;
        const filepath = (0, path_1.join)(dir, filename);
        await (0, promises_1.writeFile)(filepath, buffer);
        return filepath;
    }
    async getPdf(filepath) {
        try {
            await (0, promises_1.access)(filepath);
            return await (0, promises_1.readFile)(filepath);
        }
        catch {
            return null;
        }
    }
    async getHtml(filepath) {
        try {
            await (0, promises_1.access)(filepath);
            return await (0, promises_1.readFile)(filepath, 'utf-8');
        }
        catch {
            return null;
        }
    }
    async deleteReport(filepath) {
        try {
            await (0, promises_1.unlink)(filepath);
            return true;
        }
        catch {
            return false;
        }
    }
    getPdfUrl(filepath) {
        const relative = filepath.replace((0, path_1.join)(process.cwd(), 'uploads'), '');
        return `/uploads${relative}`;
    }
    getHtmlUrl(filepath) {
        const relative = filepath.replace((0, path_1.join)(process.cwd(), 'uploads'), '');
        return `/uploads${relative}`;
    }
}
exports.ReportStorage = ReportStorage;
exports.reportStorage = new ReportStorage();
//# sourceMappingURL=report.storage.js.map