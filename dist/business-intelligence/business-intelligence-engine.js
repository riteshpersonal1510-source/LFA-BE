"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.businessIntelligenceEngine = exports.BusinessIntelligenceEngine = void 0;
const playwright_1 = require("playwright");
const logger_1 = require("../utils/logger");
const fs_1 = require("fs");
const footer_analyzer_1 = require("./footer-analyzer");
const social_detector_1 = require("./social-detector");
const contact_detector_1 = require("./contact-detector");
const freshness_detector_1 = require("./freshness-detector");
const trust_score_engine_1 = require("./trust-score-engine");
const opportunity_engine_1 = require("./opportunity-engine");
const website_quality_engine_1 = require("./website-quality-engine");
const ai_recommendation_engine_1 = require("./ai-recommendation-engine");
const p_limit_1 = __importDefault(require("p-limit"));
class BusinessIntelligenceEngine {
    constructor() {
        this.browser = null;
        this.maxConcurrent = 3;
        this.limit = (0, p_limit_1.default)(this.maxConcurrent);
    }
    async initialize() {
        if (!this.browser) {
            let execPath = '(unknown)';
            try {
                execPath = playwright_1.chromium.executablePath();
            }
            catch { }
            logger_1.logger.info({
                executablePath: execPath,
                executableExists: (0, fs_1.existsSync)(execPath),
                cwd: process.cwd(),
                browsersPath: process.env.PLAYWRIGHT_BROWSERS_PATH || '(not set)',
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
            }, 'BusinessIntelligence: Launching Chromium');
            this.browser = await playwright_1.chromium.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
            });
            logger_1.logger.info('Business intelligence engine browser initialized');
        }
    }
    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            logger_1.logger.info('Business intelligence engine browser closed');
        }
    }
    async analyzeWebsite(url, existingData, options = {}) {
        return this.limit(async () => {
            const timeout = options.timeout || 60000;
            try {
                await this.initialize();
                if (!this.browser) {
                    throw new Error('Browser not initialized');
                }
                const normalizedUrl = this.normalizeUrl(url);
                if (!normalizedUrl) {
                    throw new Error('Invalid URL');
                }
                this.preventSSRF(normalizedUrl);
                logger_1.logger.info(`Starting business intelligence analysis for ${normalizedUrl}`);
                const page = await this.browser.newPage({
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                });
                try {
                    let navigationSucceeded = true;
                    try {
                        await page.goto(normalizedUrl, {
                            waitUntil: 'domcontentloaded',
                            timeout,
                        });
                        await page.waitForTimeout(1000);
                    }
                    catch (navError) {
                        navigationSucceeded = false;
                        logger_1.logger.warn({ err: navError, url: normalizedUrl }, 'Navigation failed, proceeding with degraded analysis');
                    }
                    let html = '';
                    if (navigationSucceeded) {
                        html = await page.content();
                    }
                    const footerAnalysis = await footer_analyzer_1.footerAnalyzer.analyzeFooter(html);
                    const socialAudit = await social_detector_1.socialDetector.detectSocialPresence(html);
                    const contactAudit = await contact_detector_1.contactDetector.detectContactInfo(html);
                    const websiteFreshness = await freshness_detector_1.freshnessDetector.detectFreshness(html, footerAnalysis.copyrightYear);
                    const sslEnabled = existingData.sslEnabled || false;
                    const seoScore = existingData.seoScore || 0;
                    const responsiveScore = existingData.responsiveScore || 0;
                    const uiuxScore = existingData.uiuxScore || 0;
                    const performanceScore = this.calculatePerformanceScore(existingData.responseTime || 0);
                    const trustScore = trust_score_engine_1.trustScoreEngine.calculateTrustScore(sslEnabled, footerAnalysis, socialAudit, contactAudit, websiteFreshness, seoScore, responsiveScore);
                    const websiteQualityScore = website_quality_engine_1.websiteQualityEngine.calculateQualityScore(seoScore, responsiveScore, uiuxScore, trustScore.score, performanceScore, socialAudit.socialPresenceScore);
                    const opportunityFactors = {
                        poorSEO: seoScore < 50,
                        outdatedUI: uiuxScore < 60,
                        missingResponsiveness: responsiveScore < 70,
                        weakSocialPresence: socialAudit.socialPresenceScore < 40,
                        noSSL: !sslEnabled,
                        noContactForm: !contactAudit.contactForm,
                        outdatedCopyright: websiteFreshness.staleCopyright,
                        poorTrustScore: trustScore.score < 50,
                        lowQualityScore: websiteQualityScore.overall < 60,
                    };
                    const businessOpportunity = opportunity_engine_1.opportunityEngine.detectOpportunity(opportunityFactors, trustScore, websiteFreshness, websiteQualityScore.overall);
                    const aiRecommendation = navigationSucceeded
                        ? ai_recommendation_engine_1.aiRecommendationEngine.generateRecommendation(businessOpportunity, opportunityFactors, websiteQualityScore)
                        : {
                            summary: 'Analysis incomplete — page could not be loaded',
                            services: [],
                            priority: 'low',
                            estimatedImpact: 'Unable to assess',
                            keyIssues: ['Page navigation failed, no content available'],
                        };
                    const report = {
                        footerAnalysis,
                        socialAudit,
                        contactAudit,
                        websiteFreshness,
                        trustScore,
                        businessOpportunity,
                        websiteQualityScore,
                        aiRecommendation,
                        analyzedAt: new Date(),
                        intelligenceCompleted: navigationSucceeded,
                    };
                    logger_1.logger.info(navigationSucceeded
                        ? `Business intelligence completed: opportunity=${businessOpportunity.level}, trust=${trustScore.score}`
                        : `Business intelligence degraded for ${normalizedUrl} — page navigation failed`);
                    return report;
                }
                finally {
                    await page.close();
                }
            }
            catch (error) {
                logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), `Business intelligence analysis failed for ${url}:`);
                return this.getDefaultReport();
            }
        });
    }
    calculatePerformanceScore(responseTime) {
        if (responseTime === 0)
            return 0;
        if (responseTime < 1000)
            return 100;
        if (responseTime < 2000)
            return 90;
        if (responseTime < 3000)
            return 75;
        if (responseTime < 5000)
            return 60;
        if (responseTime < 10000)
            return 40;
        return 20;
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
        const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '169.254.169.254'];
        if (blockedHosts.includes(hostname)) {
            throw new Error('Access to local/internal hosts is not allowed');
        }
        if (hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) {
            throw new Error('Access to private networks is not allowed');
        }
    }
    getDefaultReport() {
        return {
            footerAnalysis: {
                copyrightDetected: false,
                copyrightYear: null,
                privacyPolicy: false,
                termsPage: false,
                footerComplete: false,
                footerLinks: 0,
                hasContactInfo: false,
            },
            socialAudit: {
                instagram: false,
                facebook: false,
                linkedin: false,
                twitter: false,
                youtube: false,
                whatsapp: false,
                socialPresenceScore: 0,
                detectedLinks: [],
            },
            contactAudit: {
                phoneDetected: false,
                emailDetected: false,
                contactForm: false,
                googleMapsEmbed: false,
                officeAddress: false,
                whatsappButton: false,
                contactMethods: 0,
            },
            websiteFreshness: {
                status: 'outdated',
                copyrightYear: null,
                yearsBehind: 0,
                staleCopyright: false,
                designGeneration: 'unknown',
                modernStandards: false,
            },
            trustScore: {
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
            },
            businessOpportunity: {
                level: 'low',
                score: 0,
                reasons: [],
                recommendation: 'Analysis failed',
                estimatedValue: 'low',
            },
            websiteQualityScore: {
                overall: 0,
                breakdown: {
                    seo: 0,
                    responsiveness: 0,
                    uiux: 0,
                    trust: 0,
                    performance: 0,
                    socialPresence: 0,
                },
            },
            aiRecommendation: {
                summary: 'Analysis incomplete',
                services: [],
                priority: 'low',
                estimatedImpact: 'Unable to assess',
                keyIssues: [],
            },
            analyzedAt: new Date(),
            intelligenceCompleted: false,
        };
    }
}
exports.BusinessIntelligenceEngine = BusinessIntelligenceEngine;
exports.businessIntelligenceEngine = new BusinessIntelligenceEngine();
//# sourceMappingURL=business-intelligence-engine.js.map