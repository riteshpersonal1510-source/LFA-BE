"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.websiteQualityEngine = exports.WebsiteQualityEngine = void 0;
const logger_1 = require("../utils/logger");
class WebsiteQualityEngine {
    calculateQualityScore(seoScore, responsiveScore, uiuxScore, trustScore, performanceScore, socialPresenceScore) {
        try {
            const breakdown = {
                seo: seoScore || 0,
                responsiveness: responsiveScore || 0,
                uiux: uiuxScore || 0,
                trust: trustScore || 0,
                performance: performanceScore || 0,
                socialPresence: socialPresenceScore || 0,
            };
            const weights = {
                seo: 0.20,
                responsiveness: 0.20,
                uiux: 0.20,
                trust: 0.15,
                performance: 0.15,
                socialPresence: 0.10,
            };
            const overall = Math.round(breakdown.seo * weights.seo +
                breakdown.responsiveness * weights.responsiveness +
                breakdown.uiux * weights.uiux +
                breakdown.trust * weights.trust +
                breakdown.performance * weights.performance +
                breakdown.socialPresence * weights.socialPresence);
            const qualityScore = {
                overall,
                breakdown,
            };
            logger_1.logger.info(`Quality score calculated: overall=${overall}`);
            return qualityScore;
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to calculate quality score:');
            return this.getDefaultQualityScore();
        }
    }
    getDefaultQualityScore() {
        return {
            overall: 0,
            breakdown: {
                seo: 0,
                responsiveness: 0,
                uiux: 0,
                trust: 0,
                performance: 0,
                socialPresence: 0,
            },
        };
    }
}
exports.WebsiteQualityEngine = WebsiteQualityEngine;
exports.websiteQualityEngine = new WebsiteQualityEngine();
//# sourceMappingURL=website-quality-engine.js.map