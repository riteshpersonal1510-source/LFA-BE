"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.screenshotEngine = exports.ScreenshotEngine = void 0;
const logger_1 = require("../utils/logger");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
class ScreenshotEngine {
    constructor() {
        this.dirEnsured = false;
        this.screenshotDir = path_1.default.join(process.cwd(), 'screenshots');
    }
    async ensureScreenshotDir() {
        if (this.dirEnsured)
            return;
        try {
            await promises_1.default.mkdir(this.screenshotDir, { recursive: true });
            this.dirEnsured = true;
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to create screenshot directory:');
        }
    }
    async ensureReady() {
        await this.ensureScreenshotDir();
    }
    async captureScreenshot(page, viewport, url, quality = 80) {
        try {
            await this.ensureReady();
            await page.setViewportSize({
                width: viewport.width,
                height: viewport.height,
            });
            await page.waitForLoadState('load', { timeout: 15000 });
            await page.waitForTimeout(1000);
            const sanitizedUrl = this.sanitizeUrl(url);
            const filename = `${sanitizedUrl}_${viewport.name.replace(/\s+/g, '_')}_${Date.now()}.jpg`;
            const filepath = path_1.default.join(this.screenshotDir, filename);
            await page.screenshot({
                path: filepath,
                type: 'jpeg',
                quality,
                fullPage: false,
            });
            logger_1.logger.info(`Screenshot captured: ${filename}`);
            return filepath;
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), `Failed to capture screenshot for ${url}:`);
            return null;
        }
    }
    async captureBase64Screenshot(page, viewport, quality = 80) {
        try {
            await page.setViewportSize({
                width: viewport.width,
                height: viewport.height,
            });
            await page.waitForLoadState('load', { timeout: 15000 });
            await page.waitForTimeout(1000);
            const screenshot = await page.screenshot({
                type: 'jpeg',
                quality,
                fullPage: false,
            });
            return `data:image/jpeg;base64,${screenshot.toString('base64')}`;
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to capture base64 screenshot:');
            return null;
        }
    }
    sanitizeUrl(url) {
        return url
            .replace(/^https?:\/\//, '')
            .replace(/[^a-zA-Z0-9]/g, '_')
            .substring(0, 50);
    }
    async cleanupOldScreenshots(daysOld = 7) {
        try {
            const files = await promises_1.default.readdir(this.screenshotDir);
            const now = Date.now();
            const maxAge = daysOld * 24 * 60 * 60 * 1000;
            for (const file of files) {
                const filepath = path_1.default.join(this.screenshotDir, file);
                const stats = await promises_1.default.stat(filepath);
                if (now - stats.mtimeMs > maxAge) {
                    await promises_1.default.unlink(filepath);
                    logger_1.logger.info(`Deleted old screenshot: ${file}`);
                }
            }
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to cleanup old screenshots:');
        }
    }
}
exports.ScreenshotEngine = ScreenshotEngine;
exports.screenshotEngine = new ScreenshotEngine();
//# sourceMappingURL=screenshot-engine.js.map