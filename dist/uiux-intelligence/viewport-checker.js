"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.viewportChecker = exports.ViewportChecker = void 0;
const logger_1 = require("../utils/logger");
class ViewportChecker {
    async checkViewport(page) {
        try {
            const viewportData = await page.evaluate(() => {
                const viewportMeta = document.querySelector('meta[name="viewport"]');
                const viewportContent = viewportMeta?.getAttribute('content') || null;
                const hasViewportMeta = !!viewportMeta;
                let touchFriendly = true;
                const buttons = document.querySelectorAll('button, a, input[type="button"], input[type="submit"]');
                let smallTouchTargets = 0;
                buttons.forEach((button) => {
                    const rect = button.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        if (rect.width < 44 || rect.height < 44) {
                            smallTouchTargets++;
                        }
                    }
                });
                if (smallTouchTargets > buttons.length * 0.3) {
                    touchFriendly = false;
                }
                let fontSizeIssues = false;
                const allTextElements = document.querySelectorAll('p, span, div, a, li, td, th, h1, h2, h3, h4, h5, h6');
                let smallFontCount = 0;
                allTextElements.forEach((element) => {
                    const styles = window.getComputedStyle(element);
                    const fontSize = parseFloat(styles.fontSize);
                    if (fontSize < 12) {
                        smallFontCount++;
                    }
                });
                if (smallFontCount > allTextElements.length * 0.2) {
                    fontSizeIssues = true;
                }
                return {
                    viewportMeta: hasViewportMeta,
                    viewportContent,
                    touchFriendly,
                    fontSizeIssues,
                };
            });
            logger_1.logger.info(`Viewport checked: meta=${viewportData.viewportMeta}, touch=${viewportData.touchFriendly}`);
            return viewportData;
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to check viewport:');
            return {
                viewportMeta: false,
                viewportContent: null,
                touchFriendly: false,
                fontSizeIssues: true,
            };
        }
    }
    async checkResponsiveFrameworks(page) {
        try {
            const hasFramework = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
                const scripts = Array.from(document.querySelectorAll('script[src]'));
                const classes = document.body.className;
                const frameworkIndicators = [
                    'bootstrap',
                    'tailwind',
                    'foundation',
                    'bulma',
                    'materialize',
                    'semantic',
                    'pure',
                    'skeleton',
                ];
                for (const indicator of frameworkIndicators) {
                    const foundInLinks = links.some(link => link.getAttribute('href')?.toLowerCase().includes(indicator));
                    const foundInScripts = scripts.some(script => script.getAttribute('src')?.toLowerCase().includes(indicator));
                    const foundInClasses = classes.toLowerCase().includes(indicator);
                    if (foundInLinks || foundInScripts || foundInClasses) {
                        return true;
                    }
                }
                return false;
            });
            return hasFramework;
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to check responsive frameworks:');
            return false;
        }
    }
    async checkMediaQueries(page) {
        try {
            const hasMediaQueries = await page.evaluate(() => {
                const stylesheets = Array.from(document.styleSheets);
                for (const stylesheet of stylesheets) {
                    try {
                        const rules = stylesheet.cssRules || stylesheet.rules;
                        if (!rules)
                            continue;
                        for (let i = 0; i < rules.length; i++) {
                            const rule = rules[i];
                            if (rule.constructor.name === 'CSSMediaRule') {
                                return true;
                            }
                        }
                    }
                    catch {
                        continue;
                    }
                }
                return false;
            });
            return hasMediaQueries;
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to check media queries:');
            return false;
        }
    }
}
exports.ViewportChecker = ViewportChecker;
exports.viewportChecker = new ViewportChecker();
//# sourceMappingURL=viewport-checker.js.map