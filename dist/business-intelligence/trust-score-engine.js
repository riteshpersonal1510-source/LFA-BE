"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trustScoreEngine = exports.TrustScoreEngine = void 0;
const logger_1 = require("../utils/logger");
class TrustScoreEngine {
    calculateTrustScore(sslEnabled, footerAnalysis, socialAudit, contactAudit, websiteFreshness, seoScore, responsiveScore) {
        try {
            let score = 0;
            const factors = {
                ssl: sslEnabled,
                contactPresence: contactAudit.contactMethods >= 2,
                socialPresence: socialAudit.socialPresenceScore >= 40,
                seoQuality: seoScore >= 60,
                responsiveness: responsiveScore >= 70,
                copyrightFresh: !websiteFreshness.staleCopyright,
                businessTransparency: footerAnalysis.footerComplete,
            };
            if (factors.ssl)
                score += 20;
            if (factors.contactPresence)
                score += 15;
            if (factors.socialPresence)
                score += 15;
            if (factors.seoQuality)
                score += 10;
            if (factors.responsiveness)
                score += 10;
            if (factors.copyrightFresh)
                score += 15;
            if (factors.businessTransparency)
                score += 15;
            if (footerAnalysis.privacyPolicy)
                score += 5;
            if (footerAnalysis.termsPage)
                score += 5;
            if (contactAudit.contactForm)
                score += 5;
            if (contactAudit.googleMapsEmbed)
                score += 5;
            score = Math.min(score, 100);
            let level;
            if (score >= 75) {
                level = 'high';
            }
            else if (score >= 50) {
                level = 'medium';
            }
            else {
                level = 'low';
            }
            const trustScore = {
                score,
                level,
                factors,
            };
            logger_1.logger.info(`Trust score calculated: ${score} (${level})`);
            return trustScore;
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to calculate trust score:');
            return this.getDefaultTrustScore();
        }
    }
    getDefaultTrustScore() {
        return {
            score: 0,
            level: 'low',
            factors: {
                ssl: false,
                contactPresence: false,
                socialPresence: false,
                seoQuality: false,
                responsiveness: false,
                copyrightFresh: false,
                businessTransparency: false,
            },
        };
    }
}
exports.TrustScoreEngine = TrustScoreEngine;
exports.trustScoreEngine = new TrustScoreEngine();
//# sourceMappingURL=trust-score-engine.js.map