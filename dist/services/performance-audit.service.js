"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceAuditService = exports.PerformanceAuditService = void 0;
const browser_manager_1 = require("../core/scraper-engine/browser-manager");
const logger_1 = require("../utils/logger");
class PerformanceAuditService {
    async auditUrl(url) {
        let page = null;
        const issues = [];
        try {
            const acquired = await browser_manager_1.browserManager.acquire('perf-audit');
            page = acquired.page;
            const resources = [];
            await page.route('**/*', (route) => {
                resources.push({
                    type: route.request().resourceType(),
                    size: 0,
                    url: route.request().url(),
                });
                route.continue();
            });
            const navigationStart = Date.now();
            await page.goto(url, { waitUntil: 'load', timeout: 15000 });
            const loadTimeMs = Date.now() - navigationStart;
            const domReadyMs = await page.evaluate(() => {
                const nav = performance.getEntriesByType('navigation')[0];
                return nav ? nav.domContentLoadedEventEnd : 0;
            }).catch(() => loadTimeMs);
            const lcpEstimateMs = await page.evaluate(() => {
                return new Promise((resolve) => {
                    const observer = new PerformanceObserver((list) => {
                        const entries = list.getEntries();
                        if (entries.length > 0) {
                            resolve(entries[entries.length - 1].startTime);
                        }
                        observer.disconnect();
                    });
                    observer.observe({ type: 'largest-contentful-paint', buffered: true });
                    setTimeout(() => resolve(0), 3000);
                });
            }).catch(() => 0);
            const perfData = await page.evaluate(() => {
                const allResources = performance.getEntriesByType('resource');
                let totalSize = 0;
                let imgCount = 0;
                let scriptCount = 0;
                let blockingCount = 0;
                for (const r of allResources) {
                    if (r.transferSize)
                        totalSize += r.transferSize;
                    if (r.initiatorType === 'img')
                        imgCount++;
                    if (r.initiatorType === 'script') {
                        scriptCount++;
                        if (r.duration > 500)
                            blockingCount++;
                    }
                    if (r.initiatorType === 'link' && r.name?.includes('.css'))
                        blockingCount++;
                }
                return { totalSize, imgCount, scriptCount, blockingCount };
            }).catch(() => ({ totalSize: 0, imgCount: 0, scriptCount: 0, blockingCount: 0 }));
            const pageWeightKB = Math.round(perfData.totalSize / 1024);
            const heavyImages = perfData.imgCount;
            const largeScripts = perfData.scriptCount;
            const renderBlockingResources = perfData.blockingCount;
            if (loadTimeMs > 3000)
                issues.push(`Slow page load: ${loadTimeMs}ms`);
            if (pageWeightKB > 2000)
                issues.push(`Heavy page: ${pageWeightKB}KB`);
            if (largeScripts > 5)
                issues.push(`Large number of scripts: ${largeScripts}`);
            if (renderBlockingResources > 3)
                issues.push(`Render-blocking resources: ${renderBlockingResources}`);
            if (heavyImages > 10)
                issues.push(`Many unoptimized images: ${heavyImages}`);
            let score = 60;
            if (loadTimeMs < 1000)
                score += 20;
            else if (loadTimeMs < 2000)
                score += 10;
            else if (loadTimeMs > 5000)
                score -= 10;
            if (pageWeightKB < 500)
                score += 10;
            else if (pageWeightKB > 3000)
                score -= 10;
            if (renderBlockingResources === 0)
                score += 5;
            if (largeScripts <= 3)
                score += 5;
            score = Math.max(0, Math.min(100, score));
            return {
                loadTimeMs, domReadyMs, lcpEstimateMs,
                pageWeightKB, requestCount: resources.length,
                heavyImages, largeScripts, renderBlockingResources,
                score, issues,
            };
        }
        catch (error) {
            logger_1.logger.error({ url, err: error instanceof Error ? error.message : String(error) }, 'PerformanceAudit: Failed');
            return {
                loadTimeMs: 0, domReadyMs: 0, lcpEstimateMs: 0,
                pageWeightKB: 0, requestCount: 0,
                heavyImages: 0, largeScripts: 0, renderBlockingResources: 0,
                score: 0, issues: ['Performance audit failed'],
            };
        }
        finally {
            if (page)
                await browser_manager_1.browserManager.release(page, 'perf-audit').catch(() => { });
        }
    }
}
exports.PerformanceAuditService = PerformanceAuditService;
exports.performanceAuditService = new PerformanceAuditService();
//# sourceMappingURL=performance-audit.service.js.map