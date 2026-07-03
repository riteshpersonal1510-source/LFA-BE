"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportPdfEngine = exports.ReportPdfEngine = void 0;
const logger_1 = require("../../utils/logger");
const browser_pool_service_1 = require("../../services/browser-pool.service");
const RENDER_TIMEOUT = 30000;
class ReportPdfEngine {
    async generatePdf(html) {
        const { page } = await browser_pool_service_1.browserPool.acquire('report-pdf');
        try {
            page.setDefaultTimeout(RENDER_TIMEOUT);
            await page.setContent(html, {
                waitUntil: 'networkidle',
                timeout: RENDER_TIMEOUT,
            });
            await page.waitForTimeout(500);
            const pdfBuffer = await page.pdf({
                format: 'A4',
                margin: {
                    top: '20px',
                    bottom: '20px',
                    left: '20px',
                    right: '20px',
                },
                printBackground: true,
                preferCSSPageSize: true,
            });
            return Buffer.from(pdfBuffer);
        }
        catch (error) {
            logger_1.logger.error({ err: error instanceof Error ? error.message : String(error) }, '[ReportPdf] PDF generation failed');
            throw error;
        }
        finally {
            await browser_pool_service_1.browserPool.release(page, 'report-pdf');
        }
    }
    async captureScreenshot(html, viewport) {
        const { page } = await browser_pool_service_1.browserPool.acquire('report-screenshot');
        try {
            page.setDefaultTimeout(RENDER_TIMEOUT);
            await page.setViewportSize(viewport);
            await page.setContent(html, {
                waitUntil: 'networkidle',
                timeout: RENDER_TIMEOUT,
            });
            await page.waitForTimeout(300);
            const screenshot = await page.screenshot({ fullPage: false, type: 'png' });
            return Buffer.from(screenshot);
        }
        finally {
            await browser_pool_service_1.browserPool.release(page, 'report-screenshot');
        }
    }
    async close() {
    }
}
exports.ReportPdfEngine = ReportPdfEngine;
exports.reportPdfEngine = new ReportPdfEngine();
//# sourceMappingURL=report.pdf.js.map