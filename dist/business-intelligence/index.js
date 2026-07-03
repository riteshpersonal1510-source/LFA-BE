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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIRecommendationEngine = exports.aiRecommendationEngine = exports.WebsiteQualityEngine = exports.websiteQualityEngine = exports.OpportunityEngine = exports.opportunityEngine = exports.TrustScoreEngine = exports.trustScoreEngine = exports.FreshnessDetector = exports.freshnessDetector = exports.ContactDetector = exports.contactDetector = exports.SocialDetector = exports.socialDetector = exports.FooterAnalyzer = exports.footerAnalyzer = exports.BusinessIntelligenceEngine = exports.businessIntelligenceEngine = void 0;
var business_intelligence_engine_1 = require("./business-intelligence-engine");
Object.defineProperty(exports, "businessIntelligenceEngine", { enumerable: true, get: function () { return business_intelligence_engine_1.businessIntelligenceEngine; } });
Object.defineProperty(exports, "BusinessIntelligenceEngine", { enumerable: true, get: function () { return business_intelligence_engine_1.BusinessIntelligenceEngine; } });
var footer_analyzer_1 = require("./footer-analyzer");
Object.defineProperty(exports, "footerAnalyzer", { enumerable: true, get: function () { return footer_analyzer_1.footerAnalyzer; } });
Object.defineProperty(exports, "FooterAnalyzer", { enumerable: true, get: function () { return footer_analyzer_1.FooterAnalyzer; } });
var social_detector_1 = require("./social-detector");
Object.defineProperty(exports, "socialDetector", { enumerable: true, get: function () { return social_detector_1.socialDetector; } });
Object.defineProperty(exports, "SocialDetector", { enumerable: true, get: function () { return social_detector_1.SocialDetector; } });
var contact_detector_1 = require("./contact-detector");
Object.defineProperty(exports, "contactDetector", { enumerable: true, get: function () { return contact_detector_1.contactDetector; } });
Object.defineProperty(exports, "ContactDetector", { enumerable: true, get: function () { return contact_detector_1.ContactDetector; } });
var freshness_detector_1 = require("./freshness-detector");
Object.defineProperty(exports, "freshnessDetector", { enumerable: true, get: function () { return freshness_detector_1.freshnessDetector; } });
Object.defineProperty(exports, "FreshnessDetector", { enumerable: true, get: function () { return freshness_detector_1.FreshnessDetector; } });
var trust_score_engine_1 = require("./trust-score-engine");
Object.defineProperty(exports, "trustScoreEngine", { enumerable: true, get: function () { return trust_score_engine_1.trustScoreEngine; } });
Object.defineProperty(exports, "TrustScoreEngine", { enumerable: true, get: function () { return trust_score_engine_1.TrustScoreEngine; } });
var opportunity_engine_1 = require("./opportunity-engine");
Object.defineProperty(exports, "opportunityEngine", { enumerable: true, get: function () { return opportunity_engine_1.opportunityEngine; } });
Object.defineProperty(exports, "OpportunityEngine", { enumerable: true, get: function () { return opportunity_engine_1.OpportunityEngine; } });
var website_quality_engine_1 = require("./website-quality-engine");
Object.defineProperty(exports, "websiteQualityEngine", { enumerable: true, get: function () { return website_quality_engine_1.websiteQualityEngine; } });
Object.defineProperty(exports, "WebsiteQualityEngine", { enumerable: true, get: function () { return website_quality_engine_1.WebsiteQualityEngine; } });
var ai_recommendation_engine_1 = require("./ai-recommendation-engine");
Object.defineProperty(exports, "aiRecommendationEngine", { enumerable: true, get: function () { return ai_recommendation_engine_1.aiRecommendationEngine; } });
Object.defineProperty(exports, "AIRecommendationEngine", { enumerable: true, get: function () { return ai_recommendation_engine_1.AIRecommendationEngine; } });
__exportStar(require("./types"), exports);
//# sourceMappingURL=index.js.map