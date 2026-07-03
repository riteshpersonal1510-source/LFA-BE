"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.websiteAnalysisService = exports.WebsiteAnalysisService = void 0;
const logger_1 = require("../utils/logger");
const urlClassifier_service_1 = require("../modules/leads/services/urlClassifier.service");
function extractDomain(url) {
    try {
        const normalized = url.startsWith('http') ? url : `https://${url}`;
        const hostname = new URL(normalized).hostname.toLowerCase();
        return hostname.replace(/^www\./, '');
    }
    catch {
        return null;
    }
}
class WebsiteAnalysisService {
    analyze(websiteUrl) {
        if (!websiteUrl) {
            logger_1.logger.info('[WebsiteAnalysis] No URL provided');
            return {
                hasWebsite: false,
                websiteUrl: null,
                normalizedDomain: null,
                websiteType: 'NO_WEBSITE',
                analysisEligible: false,
            };
        }
        const classified = (0, urlClassifier_service_1.classifyWebsiteUrl)(websiteUrl);
        const domain = extractDomain(websiteUrl);
        if (classified.hasRealWebsite) {
            logger_1.logger.info({ websiteUrl, domain }, '[WebsiteAnalysis] Website Detected');
            logger_1.logger.info({ websiteUrl, domain }, '[WebsiteAnalysis] Website Normalized');
            logger_1.logger.info({ websiteUrl, domain }, '[WebsiteAnalysis] Website Classified — BUSINESS_WEBSITE');
            logger_1.logger.info({ websiteUrl, domain }, '[WebsiteAnalysis] Analysis Eligible — true');
            return {
                hasWebsite: true,
                websiteUrl: classified.normalizedUrl || websiteUrl,
                normalizedDomain: domain,
                websiteType: 'BUSINESS_WEBSITE',
                analysisEligible: true,
            };
        }
        const isSocialOrProfile = classified.websiteType === 'SOCIAL_PROFILE' ||
            classified.websiteType === 'GOOGLE_PROFILE' ||
            classified.websiteType === 'MARKETPLACE_PROFILE' ||
            classified.websiteType === 'DIRECTORY_PROFILE';
        if (isSocialOrProfile) {
            logger_1.logger.info({ websiteUrl, domain }, '[WebsiteAnalysis] Classified — ONLINE_PROFILE (non-business)');
            return {
                hasWebsite: false,
                websiteUrl: classified.normalizedUrl || websiteUrl,
                normalizedDomain: domain,
                websiteType: 'ONLINE_PROFILE',
                analysisEligible: false,
            };
        }
        logger_1.logger.info({ websiteUrl }, '[WebsiteAnalysis] Classified — NO_WEBSITE');
        return {
            hasWebsite: false,
            websiteUrl: null,
            normalizedDomain: null,
            websiteType: 'NO_WEBSITE',
            analysisEligible: false,
        };
    }
    getLeadFields(websiteUrl) {
        const result = this.analyze(websiteUrl);
        const classified = (0, urlClassifier_service_1.classifyWebsiteUrl)(websiteUrl);
        return {
            website: result.websiteUrl,
            hasWebsite: result.hasWebsite,
            normalizedDomain: result.normalizedDomain,
            websiteType: classified.websiteType,
            analysisEligible: result.analysisEligible,
            hasRealWebsite: result.analysisEligible,
            websiteAuditAllowed: result.analysisEligible,
        };
    }
    resolveLead(lead) {
        return this.analyze(lead.website);
    }
}
exports.WebsiteAnalysisService = WebsiteAnalysisService;
exports.websiteAnalysisService = new WebsiteAnalysisService();
//# sourceMappingURL=website-analysis.service.js.map