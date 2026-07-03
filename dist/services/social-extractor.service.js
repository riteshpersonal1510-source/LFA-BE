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
exports.socialExtractorService = exports.SocialExtractorService = void 0;
const logger_1 = require("../utils/logger");
class SocialExtractorService {
    constructor() {
        this.browserManager = null;
    }
    async extractSocialLinks(website, options = {}) {
        const links = {};
        const timeout = options.timeout || 15000;
        try {
            if (!this.browserManager) {
                this.browserManager = new (await Promise.resolve().then(() => __importStar(require('../scrapers/browser-manager')))).PlaywrightBrowser();
            }
            const { page } = await this.browserManager.initialize();
            page.setDefaultTimeout(timeout);
            let url = website;
            if (!url.match(/^https?:\/\//i)) {
                url = 'https://' + url;
            }
            await page.goto(url, { waitUntil: 'networkidle', timeout });
            await page.waitForTimeout(1000);
            const socialData = await page.evaluate(() => {
                const socialLinks = {};
                document.querySelectorAll('a').forEach(el => {
                    const href = el.getAttribute('href') || '';
                    if (!href)
                        return;
                    const lowerHref = href.toLowerCase();
                    if (lowerHref.includes('facebook.com')) {
                        if (!socialLinks.facebook)
                            socialLinks.facebook = href;
                    }
                    if (lowerHref.includes('instagram.com')) {
                        if (!socialLinks.instagram)
                            socialLinks.instagram = href;
                    }
                    if (lowerHref.includes('linkedin.com')) {
                        if (!socialLinks.linkedin)
                            socialLinks.linkedin = href;
                    }
                    if (lowerHref.includes('twitter.com') || lowerHref.includes('x.com')) {
                        if (!socialLinks.twitter)
                            socialLinks.twitter = href;
                    }
                    if (lowerHref.includes('youtube.com')) {
                        if (!socialLinks.youtube)
                            socialLinks.youtube = href;
                    }
                    if (lowerHref.includes('wa.me') || lowerHref.includes('whatsapp.com')) {
                        if (!socialLinks.whatsapp)
                            socialLinks.whatsapp = href;
                    }
                    if (lowerHref.includes('telegram.me') || lowerHref.includes('t.me')) {
                        if (!socialLinks.telegram)
                            socialLinks.telegram = href;
                    }
                });
                const ogData = {
                    facebook: document.querySelector('meta[property="og:facebook"]')?.getAttribute('content'),
                    instagram: document.querySelector('meta[property="og:instagram"]')?.getAttribute('content'),
                    linkedin: document.querySelector('meta[property="og:linkedin"]')?.getAttribute('content'),
                    twitter: document.querySelector('meta[property="og:twitter"]')?.getAttribute('content'),
                };
                for (const [platform, url] of Object.entries(ogData)) {
                    if (url && !socialLinks[platform]) {
                        socialLinks[platform] = url;
                    }
                }
                return socialLinks;
            });
            for (const [platform, url] of Object.entries(socialData)) {
                if (url && !links[platform]) {
                    links[platform] = url;
                }
            }
            logger_1.logger.info(`Social extraction completed for ${website}`);
        }
        catch (error) {
            logger_1.logger.error(`Social extraction failed for ${website}:`, error);
        }
        return links;
    }
    async extractFromContent(content, _baseUrl) {
        const links = {};
        try {
            const $ = await Promise.resolve().then(() => __importStar(require('cheerio'))).then(c => c.load(content));
            $('a').each((_, el) => {
                const href = $(el).attr('href') || '';
                if (!href)
                    return;
                const lowerHref = href.toLowerCase();
                if (lowerHref.includes('facebook.com') && !links.facebook) {
                    links.facebook = href;
                }
                if (lowerHref.includes('instagram.com') && !links.instagram) {
                    links.instagram = href;
                }
                if (lowerHref.includes('linkedin.com') && !links.linkedin) {
                    links.linkedin = href;
                }
                if ((lowerHref.includes('twitter.com') || lowerHref.includes('x.com')) && !links.twitter) {
                    links.twitter = href;
                }
                if (lowerHref.includes('youtube.com') && !links.youtube) {
                    links.youtube = href;
                }
                if ((lowerHref.includes('wa.me') || lowerHref.includes('whatsapp.com')) && !links.whatsapp) {
                    links.whatsapp = href;
                }
                if ((lowerHref.includes('telegram.me') || lowerHref.includes('t.me')) && !links.telegram) {
                    links.telegram = href;
                }
            });
        }
        catch (error) {
            logger_1.logger.warn(error instanceof Error ? error : new Error(String(error)), 'Failed to extract social links from content:');
        }
        return links;
    }
    async checkSocialMediaLink(url, timeout = 5000) {
        try {
            if (!this.browserManager) {
                this.browserManager = new (await Promise.resolve().then(() => __importStar(require('../scrapers/browser-manager')))).PlaywrightBrowser();
            }
            const { page } = await this.browserManager.initialize();
            page.setDefaultTimeout(timeout);
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
            await this.browserManager.close();
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.SocialExtractorService = SocialExtractorService;
exports.socialExtractorService = new SocialExtractorService();
//# sourceMappingURL=social-extractor.service.js.map