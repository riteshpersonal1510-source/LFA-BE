"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.responsiveEngine = exports.ResponsiveEngine = void 0;
const logger_1 = require("../utils/logger");
const browser_pool_service_1 = require("../services/browser-pool.service");
const types_1 = require("./types");
const screenshot_engine_1 = require("./screenshot-engine");
const layout_break_detector_1 = require("./layout-break-detector");
const viewport_checker_1 = require("./viewport-checker");
const uiux_analyzer_1 = require("./uiux-analyzer");
const responsive_score_engine_1 = require("./responsive-score-engine");
const p_limit_1 = __importDefault(require("p-limit"));
class ResponsiveEngine {
    constructor() {
        this.maxConcurrent = 2;
        this.limit = (0, p_limit_1.default)(this.maxConcurrent);
    }
    async initialize() {
    }
    async cleanup() {
    }
    async analyzeWebsite(url, options = {}) {
        return this.limit(async () => {
            const timeout = Math.min(options.timeout || 60000, 90000);
            const skipScreenshots = options.skipScreenshots || false;
            const screenshotQuality = options.screenshotQuality || 80;
            const startTime = Date.now();
            try {
                logger_1.logger.info(`[ResponsiveEngine] Starting responsive audit for ${url}`);
                const normalizedUrl = this.normalizeUrl(url);
                if (!normalizedUrl) {
                    throw new Error(`Invalid URL format: ${url}`);
                }
                this.preventSSRF(normalizedUrl);
                let desktopResults;
                try {
                    logger_1.logger.info(`[ResponsiveEngine] Analyzing desktop viewport for ${normalizedUrl}`);
                    desktopResults = await this.analyzeViewport(normalizedUrl, types_1.VIEWPORTS.DESKTOP, timeout, skipScreenshots, screenshotQuality);
                }
                catch (error) {
                    logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), `[ResponsiveEngine] Desktop viewport analysis failed for ${normalizedUrl}`);
                    throw new Error(`Desktop viewport analysis failed: ${error instanceof Error ? error.message : String(error)}`);
                }
                let mobileResults;
                try {
                    logger_1.logger.info(`[ResponsiveEngine] Analyzing mobile viewport for ${normalizedUrl}`);
                    mobileResults = await this.analyzeViewport(normalizedUrl, types_1.VIEWPORTS.MOBILE, timeout, skipScreenshots, screenshotQuality);
                }
                catch (error) {
                    logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), `[ResponsiveEngine] Mobile viewport analysis failed for ${normalizedUrl}`);
                    throw new Error(`Mobile viewport analysis failed: ${error instanceof Error ? error.message : String(error)}`);
                }
                const responsiveAudit = {
                    mobileFriendly: this.determineMobileFriendly(mobileResults),
                    responsiveLayout: this.determineResponsiveLayout(desktopResults.metrics, mobileResults.metrics),
                    horizontalScroll: mobileResults.metrics.hasHorizontalScroll,
                    overflowIssues: mobileResults.metrics.bodyOverflowX,
                    viewportMeta: mobileResults.viewport.viewportMeta || false,
                    viewportContent: mobileResults.viewport.viewportContent || null,
                    touchFriendly: mobileResults.viewport.touchFriendly || false,
                    fontSizeIssues: mobileResults.viewport.fontSizeIssues || false,
                };
                const uiuxAudit = this.mergeUIUXAudits(desktopResults.uiux, mobileResults.uiux);
                const scores = responsive_score_engine_1.responsiveScoreEngine.calculateScores(responsiveAudit, uiuxAudit, desktopResults.metrics, mobileResults.metrics);
                const result = {
                    responsiveAudit,
                    uiuxAudit,
                    screenshots: {
                        desktopScreenshot: desktopResults.screenshot,
                        mobileScreenshot: mobileResults.screenshot,
                    },
                    scores,
                    desktopMetrics: desktopResults.metrics,
                    mobileMetrics: mobileResults.metrics,
                    responsiveAuditCompleted: true,
                    auditedAt: new Date(),
                };
                const duration = Date.now() - startTime;
                logger_1.logger.info(`[ResponsiveEngine] Responsive audit COMPLETED for ${normalizedUrl} in ${duration}ms`);
                return result;
            }
            catch (error) {
                const duration = Date.now() - startTime;
                logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), `[ResponsiveEngine] Responsive audit FAILED for ${url} after ${duration}ms`);
                return {
                    responsiveAudit: {
                        mobileFriendly: false,
                        responsiveLayout: false,
                        horizontalScroll: false,
                        overflowIssues: false,
                        viewportMeta: false,
                        viewportContent: null,
                        touchFriendly: false,
                        fontSizeIssues: false,
                    },
                    uiuxAudit: {
                        alignmentIssues: false,
                        brokenButtons: false,
                        croppedSections: false,
                        mobileLayoutBroken: false,
                        overlappingContent: false,
                        hiddenContent: false,
                        navigationIssues: false,
                        spacingIssues: false,
                        issues: [],
                    },
                    screenshots: {
                        desktopScreenshot: null,
                        mobileScreenshot: null,
                    },
                    scores: {
                        responsiveScore: 0,
                        uiuxScore: 0,
                        mobileExperienceScore: 0,
                    },
                    desktopMetrics: this.getEmptyMetrics(),
                    mobileMetrics: this.getEmptyMetrics(),
                    responsiveAuditCompleted: false,
                    auditedAt: new Date(),
                };
            }
        });
    }
    async analyzeViewport(url, viewport, timeout, skipScreenshots, screenshotQuality) {
        const viewportName = viewport.isMobile ? 'mobile' : 'desktop';
        const { page, context } = await browser_pool_service_1.browserPool.acquire(`responsive-${viewportName}`);
        try {
            page.setDefaultTimeout(timeout);
            page.setDefaultNavigationTimeout(timeout);
            await page.setViewportSize({
                width: viewport.width,
                height: viewport.height,
            });
            const ua = this.getUserAgent(viewport.isMobile);
            await context.addInitScript(() => {
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            });
            await page.setExtraHTTPHeaders({ 'User-Agent': ua });
            logger_1.logger.info(`[ResponsiveEngine] Loading ${viewportName} page for ${url} with timeout ${timeout}ms`);
            try {
                await page.goto(url, {
                    waitUntil: 'load',
                    timeout,
                });
                logger_1.logger.info(`[ResponsiveEngine] Page loaded successfully for ${viewportName}`);
            }
            catch (navError) {
                logger_1.logger.warn(`[ResponsiveEngine] Page navigation ${viewportName} partially loaded or timed out`);
            }
            logger_1.logger.info(`[ResponsiveEngine] Waiting for page stabilization`);
            await page.waitForTimeout(1000);
            logger_1.logger.info(`[ResponsiveEngine] Capturing ${viewportName} screenshot`);
            const screenshot = skipScreenshots
                ? null
                : await screenshot_engine_1.screenshotEngine.captureBase64Screenshot(page, viewport, screenshotQuality);
            logger_1.logger.info(`[ResponsiveEngine] Analyzing ${viewportName} layout`);
            const metrics = await layout_break_detector_1.layoutBreakDetector.analyzeLayout(page);
            logger_1.logger.info(`[ResponsiveEngine] Checking ${viewportName} viewport configuration`);
            const viewportData = await viewport_checker_1.viewportChecker.checkViewport(page);
            logger_1.logger.info(`[ResponsiveEngine] Analyzing ${viewportName} UI/UX`);
            const uiuxData = await uiux_analyzer_1.uiuxAnalyzer.analyzeUIUX(page, viewport.isMobile);
            return {
                screenshot,
                metrics,
                viewport: viewportData,
                uiux: uiuxData,
            };
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), `[ResponsiveEngine] Error analyzing ${viewportName} viewport:`);
            return {
                screenshot: null,
                metrics: this.getEmptyMetrics(),
                viewport: {
                    viewportMeta: false,
                    viewportContent: null,
                    touchFriendly: false,
                    fontSizeIssues: true,
                },
                uiux: {
                    alignmentIssues: false,
                    brokenButtons: false,
                    croppedSections: false,
                    mobileLayoutBroken: false,
                    overlappingContent: false,
                    hiddenContent: false,
                    navigationIssues: false,
                    spacingIssues: false,
                    issues: [],
                },
            };
        }
        finally {
            logger_1.logger.info(`[ResponsiveEngine] Closing ${viewportName} page`);
            await browser_pool_service_1.browserPool.release(page, `responsive-${viewportName}`);
        }
    }
    determineMobileFriendly(mobileResults) {
        if (!mobileResults.viewport.viewportMeta)
            return false;
        if (mobileResults.metrics.hasHorizontalScroll)
            return false;
        if (mobileResults.metrics.elementsOffscreen > 10)
            return false;
        if (mobileResults.uiux.mobileLayoutBroken)
            return false;
        if (mobileResults.viewport.fontSizeIssues && mobileResults.viewport.touchFriendly === false)
            return false;
        return true;
    }
    determineResponsiveLayout(_desktop, mobile) {
        if (mobile.hasHorizontalScroll)
            return false;
        if (mobile.elementsOffscreen > 5)
            return false;
        if (mobile.fixedWidthElements > 3)
            return false;
        if (mobile.overlappingElements > 5)
            return false;
        return true;
    }
    mergeUIUXAudits(desktop, mobile) {
        return {
            alignmentIssues: desktop.alignmentIssues || mobile.alignmentIssues,
            brokenButtons: desktop.brokenButtons || mobile.brokenButtons,
            croppedSections: desktop.croppedSections || mobile.croppedSections,
            mobileLayoutBroken: mobile.mobileLayoutBroken,
            overlappingContent: desktop.overlappingContent || mobile.overlappingContent,
            hiddenContent: desktop.hiddenContent || mobile.hiddenContent,
            navigationIssues: desktop.navigationIssues || mobile.navigationIssues,
            spacingIssues: desktop.spacingIssues || mobile.spacingIssues,
            issues: [...desktop.issues, ...mobile.issues],
        };
    }
    getEmptyMetrics() {
        return {
            hasHorizontalScroll: false,
            bodyOverflowX: false,
            elementsOffscreen: 0,
            fixedWidthElements: 0,
            overlappingElements: 0,
        };
    }
    normalizeUrl(url) {
        if (!url || typeof url !== 'string') {
            return null;
        }
        let normalized = url.trim();
        if (!normalized.match(/^https?:\/\//i)) {
            normalized = 'https://' + normalized;
        }
        try {
            new URL(normalized);
        }
        catch {
            return null;
        }
        return normalized;
    }
    preventSSRF(url) {
        const parsedUrl = new URL(url);
        const hostname = parsedUrl.hostname.toLowerCase();
        const blockedHosts = [
            'localhost',
            '127.0.0.1',
            '0.0.0.0',
            '::1',
            '169.254.169.254',
        ];
        if (blockedHosts.includes(hostname)) {
            throw new Error('Access to local/internal hosts is not allowed');
        }
        if (hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) {
            throw new Error('Access to private networks is not allowed');
        }
    }
    getUserAgent(isMobile) {
        if (isMobile) {
            return 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1';
        }
        return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    }
}
exports.ResponsiveEngine = ResponsiveEngine;
exports.responsiveEngine = new ResponsiveEngine();
//# sourceMappingURL=responsive-engine.js.map