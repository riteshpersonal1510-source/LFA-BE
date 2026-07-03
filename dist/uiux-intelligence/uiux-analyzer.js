"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uiuxAnalyzer = exports.UIUXAnalyzer = void 0;
const logger_1 = require("../utils/logger");
class UIUXAnalyzer {
    async analyzeUIUX(page, isMobile) {
        try {
            const rawData = await page.evaluate((mobile) => {
                const result = {
                    alignment: [],
                    buttons: [],
                    overlap: [],
                    hiddenContent: [],
                    navigation: [],
                    spacing: [],
                    touchTargets: [],
                };
                {
                    const containers = document.querySelectorAll('div, section, article, main');
                    containers.forEach((container) => {
                        const children = Array.from(container.children);
                        if (children.length < 2)
                            return;
                        const childPositions = children.map((child) => {
                            const rect = child.getBoundingClientRect();
                            return { left: rect.left, element: child.tagName };
                        });
                        const leftPositions = childPositions.map(c => c.left);
                        const uniquePositions = new Set(leftPositions);
                        if (uniquePositions.size > children.length * 0.7 && children.length > 3) {
                            result.alignment.push({
                                description: 'Inconsistent alignment detected in container',
                                element: container.tagName.toLowerCase(),
                            });
                        }
                    });
                }
                {
                    const buttons = document.querySelectorAll('button, a.btn, input[type="button"], input[type="submit"]');
                    buttons.forEach((button) => {
                        const rect = button.getBoundingClientRect();
                        const styles = window.getComputedStyle(button);
                        if (rect.width < 10 || rect.height < 10) {
                            result.buttons.push({
                                description: 'Button too small or collapsed',
                                element: button.tagName.toLowerCase(),
                            });
                        }
                        if (styles.pointerEvents === 'none' && !button.hasAttribute('disabled')) {
                            result.buttons.push({
                                description: 'Button has pointer-events: none',
                                element: button.tagName.toLowerCase(),
                            });
                        }
                        if (styles.visibility === 'hidden' || styles.display === 'none') {
                            result.buttons.push({
                                description: 'Button is hidden',
                                element: button.tagName.toLowerCase(),
                            });
                        }
                    });
                }
                {
                    const elements = document.querySelectorAll('div, section, article, header, footer, nav');
                    const rects = [];
                    elements.forEach((element) => {
                        const rect = element.getBoundingClientRect();
                        if (rect.width > 0 && rect.height > 0) {
                            rects.push({ rect, element });
                        }
                    });
                    let overlapCount = 0;
                    const limit = Math.min(rects.length, 50);
                    for (let i = 0; i < limit; i++) {
                        for (let j = i + 1; j < limit; j++) {
                            const rect1 = rects[i].rect;
                            const rect2 = rects[j].rect;
                            const overlap = !(rect1.right < rect2.left ||
                                rect1.left > rect2.right ||
                                rect1.bottom < rect2.top ||
                                rect1.top > rect2.bottom);
                            if (overlap)
                                overlapCount++;
                        }
                    }
                    if (overlapCount > 5) {
                        result.overlap.push({
                            description: `Multiple overlapping elements detected (${overlapCount} overlaps)`,
                        });
                    }
                }
                {
                    const allElements = document.querySelectorAll('*');
                    let hiddenCount = 0;
                    allElements.forEach((element) => {
                        const rect = element.getBoundingClientRect();
                        if (rect.left < -100 || rect.top < -100) {
                            hiddenCount++;
                        }
                    });
                    if (hiddenCount > 10) {
                        result.hiddenContent.push({
                            description: `${hiddenCount} elements positioned off-screen`,
                            element: 'various',
                        });
                    }
                }
                {
                    const nav = document.querySelector('nav, header nav, .navbar, .navigation');
                    if (!nav) {
                        result.navigation.push({
                            description: 'No navigation element detected',
                        });
                    }
                    else {
                        const navRect = nav.getBoundingClientRect();
                        if (navRect.width === 0 || navRect.height === 0) {
                            result.navigation.push({
                                description: 'Navigation element has zero dimensions',
                            });
                        }
                        const links = nav.querySelectorAll('a');
                        if (links.length === 0) {
                            result.navigation.push({
                                description: 'Navigation has no links',
                            });
                        }
                    }
                }
                {
                    const elements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div, section');
                    let tooCloseCount = 0;
                    let totalChecked = 0;
                    elements.forEach((element) => {
                        const styles = window.getComputedStyle(element);
                        const marginTop = parseFloat(styles.marginTop);
                        const marginBottom = parseFloat(styles.marginBottom);
                        const paddingTop = parseFloat(styles.paddingTop);
                        const paddingBottom = parseFloat(styles.paddingBottom);
                        const totalSpacing = marginTop + marginBottom + paddingTop + paddingBottom;
                        if (totalSpacing < 2 && element.textContent && element.textContent.trim().length > 20) {
                            tooCloseCount++;
                        }
                        totalChecked++;
                    });
                    if (totalChecked > 0 && tooCloseCount > totalChecked * 0.3) {
                        result.spacing.push({
                            description: 'Many elements have insufficient spacing',
                        });
                    }
                }
                if (mobile) {
                    const touchTargets = document.querySelectorAll('button, a, input, select, textarea');
                    let smallTargets = 0;
                    let totalTargets = 0;
                    touchTargets.forEach((target) => {
                        const rect = target.getBoundingClientRect();
                        if (rect.width > 0 && rect.height > 0) {
                            totalTargets++;
                            if (rect.width < 44 || rect.height < 44) {
                                smallTargets++;
                            }
                        }
                    });
                    if (totalTargets > 0 && smallTargets > totalTargets * 0.3) {
                        result.touchTargets.push({
                            description: `${smallTargets} touch targets smaller than 44x44px`,
                        });
                    }
                }
                return result;
            }, isMobile);
            const issues = [];
            for (const item of rawData.alignment) {
                issues.push({
                    type: 'alignment',
                    severity: 'warning',
                    description: item.description,
                    element: item.element,
                });
            }
            for (const item of rawData.buttons) {
                issues.push({
                    type: 'broken-button',
                    severity: 'critical',
                    description: item.description,
                    element: item.element,
                });
            }
            for (const item of rawData.overlap) {
                issues.push({
                    type: 'overlap',
                    severity: 'warning',
                    description: item.description,
                });
            }
            for (const item of rawData.hiddenContent) {
                issues.push({
                    type: 'hidden-content',
                    severity: 'info',
                    description: item.description,
                    element: item.element,
                });
            }
            for (const item of rawData.navigation) {
                issues.push({
                    type: 'broken-navigation',
                    severity: 'warning',
                    description: item.description,
                });
            }
            for (const item of rawData.spacing) {
                issues.push({
                    type: 'spacing',
                    severity: 'info',
                    description: item.description,
                });
            }
            for (const item of rawData.touchTargets) {
                issues.push({
                    type: 'touch-target',
                    severity: 'warning',
                    description: item.description,
                });
            }
            const result = {
                alignmentIssues: rawData.alignment.length > 0,
                brokenButtons: rawData.buttons.length > 0,
                croppedSections: this.hasCroppedSections(issues),
                mobileLayoutBroken: isMobile && this.hasLayoutBreak(issues),
                overlappingContent: rawData.overlap.length > 0,
                hiddenContent: rawData.hiddenContent.length > 0,
                navigationIssues: rawData.navigation.length > 0,
                spacingIssues: rawData.spacing.length > 0,
                issues,
            };
            logger_1.logger.info(`UI/UX analysis completed: ${issues.length} issues found`);
            return result;
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to analyze UI/UX:');
            return {
                alignmentIssues: false,
                brokenButtons: false,
                croppedSections: false,
                mobileLayoutBroken: false,
                overlappingContent: false,
                hiddenContent: false,
                navigationIssues: false,
                spacingIssues: false,
                issues: [],
            };
        }
    }
    hasCroppedSections(issues) {
        return issues.some(issue => issue.type === 'hidden-content' ||
            issue.description.includes('offscreen') ||
            issue.description.includes('cropped'));
    }
    hasLayoutBreak(issues) {
        return issues.some(issue => issue.type === 'layout-break' ||
            issue.type === 'horizontal-scroll' ||
            issue.type === 'overflow' ||
            issue.severity === 'critical');
    }
}
exports.UIUXAnalyzer = UIUXAnalyzer;
exports.uiuxAnalyzer = new UIUXAnalyzer();
//# sourceMappingURL=uiux-analyzer.js.map