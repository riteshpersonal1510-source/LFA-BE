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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.websiteAnalyzerService = exports.WebsiteAnalyzerService = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const logger_1 = require("../utils/logger");
const website_analysis_service_1 = require("./website-analysis.service");
class WebsiteAnalyzerService {
    constructor() {
        this.defaultTimeout = 15000;
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ];
    }
    async analyzeWebsite(website, options = {}) {
        const startTime = Date.now();
        const timeout = options.timeout || this.defaultTimeout;
        const userAgent = this.getRandomUserAgent();
        const analysis = {
            url: website,
            sslEnabled: false,
            responseTime: 0,
            hasContactPage: false,
            hasSocialLinks: {
                facebook: false,
                instagram: false,
                linkedin: false,
                twitter: false,
            },
            metaTitle: '',
            metaDescription: '',
            mobileFriendly: false,
            modernStructure: false,
            seoScore: 0,
            qualityScore: 0,
            issues: [],
        };
        try {
            let normalizedUrl = this.normalizeUrl(website);
            if (!normalizedUrl) {
                throw new Error('Invalid website URL');
            }
            const response = await axios_1.default.get(normalizedUrl, {
                timeout,
                headers: {
                    'User-Agent': userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                },
                maxRedirects: 5,
                validateStatus: () => true,
            });
            const endTime = Date.now();
            analysis.responseTime = endTime - startTime;
            analysis.sslEnabled = normalizedUrl.startsWith('https://');
            const $ = cheerio.load(response.data);
            analysis.metaTitle = this.extractMetaTitle($);
            analysis.metaDescription = this.extractMetaDescription($);
            analysis.hasContactPage = this.detectContactPage($, response.request.res?.responseUrl || normalizedUrl);
            analysis.hasSocialLinks = this.detectSocialLinks($, response.request.res?.responseUrl || normalizedUrl);
            analysis.mobileFriendly = this.checkMobileFriendly($);
            analysis.modernStructure = this.checkModernStructure($);
            analysis.seoScore = this.calculateSeoScore($, analysis);
            analysis.qualityScore = this.calculateQualityScore(analysis);
            analysis.issues = this.detectIssues($, analysis);
            logger_1.logger.info(`Website analysis completed for ${website} - Score: ${analysis.qualityScore}`);
        }
        catch (error) {
            logger_1.logger.warn(`Website analysis failed for ${website}: ${error.message}`);
            if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
                analysis.issues.push('Website timeout or unreachable');
            }
            else if (error.code === 'ECONNREFUSED') {
                analysis.issues.push('Connection refused');
            }
            else if (error.response) {
                analysis.issues.push(`HTTP ${error.response.status}`);
            }
            else {
                analysis.issues.push(error.message || 'Unknown error');
            }
        }
        return analysis;
    }
    async analyzeLead(leadId, website) {
        const analysis = website_analysis_service_1.websiteAnalysisService.analyze(website);
        if (!analysis.analysisEligible) {
            logger_1.logger.info(`Lead ${leadId}: Non-business website detected — skipping heavy analysis`);
            const wAnalysis = {
                url: website,
                sslEnabled: false,
                responseTime: 0,
                metaTitle: '',
                metaDescription: '',
                hasContactPage: false,
                hasSocialLinks: { facebook: false, instagram: false, linkedin: false, twitter: false },
                mobileFriendly: false,
                modernStructure: false,
                seoScore: 0,
                qualityScore: 0,
                issues: [`Non-business website (${analysis.websiteType})`],
            };
            return {
                leadId,
                websiteStatus: 'no-website',
                leadScore: 0,
                qualificationLevel: 'low-potential',
                analyzedAt: new Date().toISOString(),
                analysisData: wAnalysis,
            };
        }
        const websiteData = await this.analyzeWebsite(website);
        const websiteStatus = this.determineWebsiteStatus(websiteData);
        const leadScore = this.calculateLeadScore(websiteData, websiteStatus);
        const qualificationLevel = this.determineQualificationLevel(leadScore);
        const leadAnalysis = {
            leadId,
            websiteStatus,
            leadScore,
            qualificationLevel,
            analyzedAt: new Date().toISOString(),
            analysisData: websiteData,
        };
        logger_1.logger.info(`Lead analysis completed for ${leadId}: Score=${leadScore}, Status=${websiteStatus}, Level=${qualificationLevel}`);
        return leadAnalysis;
    }
    async analyzeBulk(leads, options = {}) {
        const limit = options.limit || 50;
        const results = [];
        let successful = 0;
        let failed = 0;
        const batchSize = 5;
        for (let i = 0; i < Math.min(leads.length, limit); i += batchSize) {
            const batch = leads.slice(i, i + batchSize);
            const batchPromises = batch.map(async (lead) => {
                if (!lead.website) {
                    failed++;
                    return null;
                }
                try {
                    const analysis = await this.analyzeLead(lead.id, lead.website);
                    successful++;
                    return analysis;
                }
                catch (error) {
                    logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), `Failed to analyze lead ${lead.id}:`);
                    failed++;
                    return null;
                }
            });
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults.filter((r) => !!r));
        }
        return {
            success: true,
            message: `Analyzed ${successful} websites, ${failed} failed`,
            totalAnalyzed: successful,
            results,
        };
    }
    determineWebsiteStatus(analysis) {
        const issues = analysis.issues.length;
        const qualityScore = analysis.qualityScore;
        if (issues >= 3 || analysis.responseTime === 0) {
            return 'no-website';
        }
        if (issues >= 2 || qualityScore < 30) {
            return 'broken-website';
        }
        if (qualityScore < 60 || !analysis.modernStructure || !analysis.hasContactPage) {
            return 'outdated-website';
        }
        if (qualityScore < 80 || !analysis.sslEnabled) {
            return 'average-website';
        }
        return 'modern-website';
    }
    calculateLeadScore(analysis, websiteStatus) {
        let score = 50;
        switch (websiteStatus) {
            case 'no-website':
                score = 95;
                break;
            case 'broken-website':
                score = 90;
                break;
            case 'outdated-website':
                score = 75;
                break;
            case 'average-website':
                score = 60;
                break;
            case 'modern-website':
                score = 20;
                break;
        }
        if (!analysis.sslEnabled) {
            score += 10;
        }
        if (!analysis.metaTitle || analysis.metaTitle.length < 10) {
            score += 5;
        }
        if (!analysis.metaDescription || analysis.metaDescription.length < 50) {
            score += 5;
        }
        if (analysis.responseTime > 3000) {
            score += 5;
        }
        if (analysis.responseTime > 5000) {
            score += 10;
        }
        if (!analysis.hasContactPage) {
            score += 5;
        }
        const socialCount = Object.values(analysis.hasSocialLinks).filter(Boolean).length;
        if (socialCount === 0) {
            score += 5;
        }
        if (analysis.seoScore < 50) {
            score += 10;
        }
        return Math.min(score, 100);
    }
    determineQualificationLevel(leadScore) {
        if (leadScore >= 85) {
            return 'high-potential';
        }
        if (leadScore >= 60) {
            return 'medium-potential';
        }
        return 'low-potential';
    }
    extractMetaTitle($) {
        const title = $('title').text().trim();
        return title || '';
    }
    extractMetaDescription($) {
        const description = $('meta[name="description"]').attr('content');
        return description ? description.trim() : '';
    }
    detectContactPage($, baseUrl) {
        const contactLinks = $('a')
            .filter((_, el) => {
            const href = $(el).attr('href') || '';
            const text = $(el).text().toLowerCase();
            return text.includes('contact') || href.includes('contact');
        })
            .length;
        if (contactLinks > 0)
            return true;
        const contactPaths = ['/contact', '/contact-us', '/contacto', '/contactar', '/about/contact'];
        for (const path of contactPaths) {
            const fullUrl = baseUrl.replace(/\/+$/, '') + path;
            if (fullUrl.includes(baseUrl.split('/')[2])) {
                return true;
            }
        }
        return false;
    }
    detectSocialLinks($, _baseUrl) {
        const socialLinks = {
            facebook: false,
            instagram: false,
            linkedin: false,
            twitter: false,
        };
        const allLinks = $('a').map((_, el) => $(el).attr('href')).toArray();
        for (const href of allLinks) {
            if (!href)
                continue;
            const lowerHref = href.toLowerCase();
            if (lowerHref.includes('facebook.com')) {
                socialLinks.facebook = true;
            }
            if (lowerHref.includes('instagram.com')) {
                socialLinks.instagram = true;
            }
            if (lowerHref.includes('linkedin.com')) {
                socialLinks.linkedin = true;
            }
            if (lowerHref.includes('twitter.com') || lowerHref.includes('x.com')) {
                socialLinks.twitter = true;
            }
        }
        return socialLinks;
    }
    checkMobileFriendly($) {
        const viewport = $('meta[name="viewport"]').length > 0;
        const bootstrap = $('link[href*="bootstrap"]').length > 0;
        const tailwind = $('link[href*="tailwind"]').length > 0;
        const foundation = $('link[href*="foundation"]').length > 0;
        const mobileMeta = $('meta[name="mobile-web-app-capable"]').length > 0 ||
            $('meta[name="apple-mobile-web-app-capable"]').length > 0 ||
            $('meta[property="og:site_name"]').length > 0;
        return viewport || bootstrap || tailwind || foundation || mobileMeta;
    }
    checkModernStructure($) {
        const hasHtml5 = $('html[lang]').length > 0;
        const semanticElements = ['header', 'nav', 'main', 'footer', 'section', 'article'];
        let semanticScore = 0;
        for (const element of semanticElements) {
            if ($(element).length > 0) {
                semanticScore++;
            }
        }
        const structuredData = $('script[type="application/ld+json"]').length > 0;
        const modernMeta = $('meta[property="og:title"]').length > 0 ||
            $('meta[property="og:description"]').length > 0 ||
            $('meta[name="theme-color"]').length > 0;
        return hasHtml5 && (semanticScore >= 2 || structuredData || modernMeta);
    }
    calculateSeoScore($, analysis) {
        let score = 0;
        const title = analysis.metaTitle;
        if (title) {
            if (title.length >= 30 && title.length <= 60) {
                score += 20;
            }
            else if (title.length > 0) {
                score += 10;
            }
        }
        const description = analysis.metaDescription;
        if (description) {
            if (description.length >= 120 && description.length <= 160) {
                score += 20;
            }
            else if (description.length > 0) {
                score += 10;
            }
        }
        const h1Count = $('h1').length;
        if (h1Count === 1) {
            score += 15;
        }
        else if (h1Count > 0) {
            score += 10;
        }
        const allImages = $('img').length;
        const imagesWithAlt = $('img[alt]').length;
        if (allImages > 0) {
            score += (imagesWithAlt / allImages) * 15;
        }
        const internalLinks = $('a[href^="/"]').length;
        if (internalLinks > 5) {
            score += 10;
        }
        else if (internalLinks > 0) {
            score += 5;
        }
        if (analysis.mobileFriendly) {
            score += 10;
        }
        if (analysis.sslEnabled) {
            score += 10;
        }
        return Math.round(score);
    }
    calculateQualityScore(analysis) {
        let score = 0;
        if (analysis.sslEnabled)
            score += 20;
        if (analysis.metaTitle && analysis.metaTitle.length >= 30)
            score += 10;
        if (analysis.metaDescription && analysis.metaDescription.length >= 120)
            score += 10;
        if (analysis.hasContactPage)
            score += 15;
        const socialCount = Object.values(analysis.hasSocialLinks).filter(Boolean).length;
        score += (socialCount / 4) * 15;
        if (analysis.mobileFriendly)
            score += 10;
        if (analysis.modernStructure)
            score += 10;
        if (analysis.responseTime > 0) {
            if (analysis.responseTime < 1000)
                score += 10;
            else if (analysis.responseTime < 2000)
                score += 8;
            else if (analysis.responseTime < 3000)
                score += 5;
        }
        return Math.round(score);
    }
    detectIssues($, analysis) {
        const issues = [];
        if (!analysis.metaTitle || analysis.metaTitle.length < 10) {
            issues.push('Missing or very short title tag');
        }
        if (!analysis.metaDescription || analysis.metaDescription.length < 50) {
            issues.push('Missing or very short meta description');
        }
        if (!analysis.sslEnabled) {
            issues.push('Website does not use HTTPS');
        }
        if (!analysis.hasContactPage) {
            issues.push('No contact page detected');
        }
        const socialCount = Object.values(analysis.hasSocialLinks).filter(Boolean).length;
        if (socialCount === 0) {
            issues.push('No social media links detected');
        }
        if (analysis.responseTime > 5000) {
            issues.push('Slow response time (>5 seconds)');
        }
        else if (analysis.responseTime > 3000) {
            issues.push('Slow response time (>3 seconds)');
        }
        if ($('h1').length === 0) {
            issues.push('Missing H1 heading');
        }
        const allImages = $('img').length;
        const imagesWithoutAlt = $('img:not([alt])').length;
        if (allImages > 0 && imagesWithoutAlt > allImages / 2) {
            issues.push('Many images missing alt attributes');
        }
        const hasHtml5 = $('html[lang]').length > 0;
        if (!hasHtml5) {
            issues.push('Website may not use HTML5');
        }
        return issues;
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
    getRandomUserAgent() {
        const index = Math.floor(Math.random() * this.userAgents.length);
        return this.userAgents[index];
    }
}
exports.WebsiteAnalyzerService = WebsiteAnalyzerService;
exports.websiteAnalyzerService = new WebsiteAnalyzerService();
//# sourceMappingURL=website-analyzer.service.js.map