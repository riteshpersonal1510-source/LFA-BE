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
Object.defineProperty(exports, "__esModule", { value: true });
exports.footerAnalyzer = exports.FooterAnalyzer = void 0;
const cheerio = __importStar(require("cheerio"));
const logger_1 = require("../utils/logger");
class FooterAnalyzer {
    async analyzeFooter(html) {
        try {
            const $ = cheerio.load(html);
            const copyrightData = await this.detectCopyright($);
            const privacyPolicy = this.detectPrivacyPolicy($);
            const termsPage = this.detectTermsPage($);
            const footerLinks = this.countFooterLinks($);
            const hasContactInfo = this.detectFooterContact($);
            const footerComplete = copyrightData.detected &&
                privacyPolicy &&
                footerLinks > 3 &&
                hasContactInfo;
            const analysis = {
                copyrightDetected: copyrightData.detected,
                copyrightYear: copyrightData.year,
                privacyPolicy,
                termsPage,
                footerComplete,
                footerLinks,
                hasContactInfo,
            };
            logger_1.logger.info(`Footer analyzed: copyright=${copyrightData.year}, privacy=${privacyPolicy}, complete=${footerComplete}`);
            return analysis;
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to analyze footer:');
            return this.getDefaultFooterAnalysis();
        }
    }
    detectCopyright($) {
        const currentYear = new Date().getFullYear();
        const footerSelectors = ['footer', '.footer', '#footer', '[role="contentinfo"]'];
        for (const selector of footerSelectors) {
            const footerText = $(selector).text().toLowerCase();
            if (footerText.includes('©') || footerText.includes('copyright')) {
                const yearMatches = footerText.match(/(?:©|copyright)\s*(?:\(c\)\s*)?(\d{4})/i);
                if (yearMatches) {
                    const year = parseInt(yearMatches[1], 10);
                    return { detected: true, year };
                }
                const yearRangeMatches = footerText.match(/(\d{4})\s*-\s*(\d{4})/);
                if (yearRangeMatches) {
                    const endYear = parseInt(yearRangeMatches[2], 10);
                    return { detected: true, year: endYear };
                }
                const standaloneYear = footerText.match(/\b(20\d{2})\b/);
                if (standaloneYear) {
                    const year = parseInt(standaloneYear[1], 10);
                    if (year >= 2010 && year <= currentYear + 1) {
                        return { detected: true, year };
                    }
                }
                return { detected: true, year: null };
            }
        }
        const bodyText = $('body').text();
        if (bodyText.includes('©') || bodyText.includes('copyright')) {
            const yearMatches = bodyText.match(/(?:©|copyright)\s*(?:\(c\)\s*)?(\d{4})/i);
            if (yearMatches) {
                const year = parseInt(yearMatches[1], 10);
                return { detected: true, year };
            }
        }
        return { detected: false, year: null };
    }
    detectPrivacyPolicy($) {
        const privacyLinks = $('a').filter((_, el) => {
            const href = $(el).attr('href') || '';
            const text = $(el).text().toLowerCase();
            return (text.includes('privacy') ||
                text.includes('policy') ||
                href.includes('privacy') ||
                href.includes('policy'));
        });
        return privacyLinks.length > 0;
    }
    detectTermsPage($) {
        const termsLinks = $('a').filter((_, el) => {
            const href = $(el).attr('href') || '';
            const text = $(el).text().toLowerCase();
            return (text.includes('terms') ||
                text.includes('conditions') ||
                text.includes('tos') ||
                href.includes('terms') ||
                href.includes('conditions'));
        });
        return termsLinks.length > 0;
    }
    countFooterLinks($) {
        const footerSelectors = ['footer', '.footer', '#footer', '[role="contentinfo"]'];
        let maxLinks = 0;
        for (const selector of footerSelectors) {
            const links = $(selector).find('a').length;
            if (links > maxLinks) {
                maxLinks = links;
            }
        }
        return maxLinks;
    }
    detectFooterContact($) {
        const footerSelectors = ['footer', '.footer', '#footer', '[role="contentinfo"]'];
        for (const selector of footerSelectors) {
            const footerText = $(selector).text().toLowerCase();
            const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(footerText);
            const hasPhone = /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(footerText);
            if (hasEmail || hasPhone) {
                return true;
            }
        }
        return false;
    }
    getDefaultFooterAnalysis() {
        return {
            copyrightDetected: false,
            copyrightYear: null,
            privacyPolicy: false,
            termsPage: false,
            footerComplete: false,
            footerLinks: 0,
            hasContactInfo: false,
        };
    }
}
exports.FooterAnalyzer = FooterAnalyzer;
exports.footerAnalyzer = new FooterAnalyzer();
//# sourceMappingURL=footer-analyzer.js.map