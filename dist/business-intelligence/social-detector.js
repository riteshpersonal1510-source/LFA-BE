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
exports.socialDetector = exports.SocialDetector = void 0;
const cheerio = __importStar(require("cheerio"));
const logger_1 = require("../utils/logger");
class SocialDetector {
    async detectSocialPresence(html) {
        try {
            const $ = cheerio.load(html);
            const instagram = this.detectInstagram($);
            const facebook = this.detectFacebook($);
            const linkedin = this.detectLinkedIn($);
            const twitter = this.detectTwitter($);
            const youtube = this.detectYouTube($);
            const whatsapp = this.detectWhatsApp($);
            const detectedLinks = this.extractSocialLinks($);
            const socialPresenceScore = this.calculateSocialScore({
                instagram,
                facebook,
                linkedin,
                twitter,
                youtube,
                whatsapp,
            });
            const audit = {
                instagram,
                facebook,
                linkedin,
                twitter,
                youtube,
                whatsapp,
                socialPresenceScore,
                detectedLinks,
            };
            logger_1.logger.info(`Social presence: score=${socialPresenceScore}, platforms=${this.countPlatforms(audit)}`);
            return audit;
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to detect social presence:');
            return this.getDefaultSocialAudit();
        }
    }
    detectInstagram($) {
        return this.detectPlatform($, [
            'instagram.com',
            'instagr.am',
            'fa-instagram',
            'icon-instagram',
            'instagram-icon',
        ]);
    }
    detectFacebook($) {
        return this.detectPlatform($, [
            'facebook.com',
            'fb.com',
            'fa-facebook',
            'icon-facebook',
            'facebook-icon',
        ]);
    }
    detectLinkedIn($) {
        return this.detectPlatform($, [
            'linkedin.com',
            'fa-linkedin',
            'icon-linkedin',
            'linkedin-icon',
        ]);
    }
    detectTwitter($) {
        return this.detectPlatform($, [
            'twitter.com',
            'x.com',
            'fa-twitter',
            'fa-x-twitter',
            'icon-twitter',
            'twitter-icon',
        ]);
    }
    detectYouTube($) {
        return this.detectPlatform($, [
            'youtube.com',
            'youtu.be',
            'fa-youtube',
            'icon-youtube',
            'youtube-icon',
        ]);
    }
    detectWhatsApp($) {
        return this.detectPlatform($, [
            'wa.me',
            'whatsapp.com',
            'api.whatsapp.com',
            'fa-whatsapp',
            'icon-whatsapp',
            'whatsapp-icon',
        ]);
    }
    detectPlatform($, patterns) {
        const allLinks = $('a').map((_, el) => $(el).attr('href') || '').get();
        const allClasses = $('[class]').map((_, el) => $(el).attr('class') || '').get();
        const allText = $('body').text().toLowerCase();
        for (const pattern of patterns) {
            const lowerPattern = pattern.toLowerCase();
            if (allLinks.some(link => link.toLowerCase().includes(lowerPattern))) {
                return true;
            }
            if (allClasses.some(cls => cls.toLowerCase().includes(lowerPattern))) {
                return true;
            }
            if (allText.includes(lowerPattern)) {
                return true;
            }
        }
        return false;
    }
    extractSocialLinks($) {
        const socialDomains = [
            'instagram.com',
            'facebook.com',
            'linkedin.com',
            'twitter.com',
            'x.com',
            'youtube.com',
            'wa.me',
            'whatsapp.com',
        ];
        const links = [];
        $('a').each((_, el) => {
            const href = $(el).attr('href') || '';
            for (const domain of socialDomains) {
                if (href.includes(domain)) {
                    links.push(href);
                    break;
                }
            }
        });
        return [...new Set(links)];
    }
    calculateSocialScore(platforms) {
        let score = 0;
        if (platforms.instagram)
            score += 20;
        if (platforms.facebook)
            score += 20;
        if (platforms.linkedin)
            score += 15;
        if (platforms.twitter)
            score += 15;
        if (platforms.youtube)
            score += 15;
        if (platforms.whatsapp)
            score += 15;
        return Math.min(score, 100);
    }
    countPlatforms(audit) {
        let count = 0;
        if (audit.instagram)
            count++;
        if (audit.facebook)
            count++;
        if (audit.linkedin)
            count++;
        if (audit.twitter)
            count++;
        if (audit.youtube)
            count++;
        if (audit.whatsapp)
            count++;
        return count;
    }
    getDefaultSocialAudit() {
        return {
            instagram: false,
            facebook: false,
            linkedin: false,
            twitter: false,
            youtube: false,
            whatsapp: false,
            socialPresenceScore: 0,
            detectedLinks: [],
        };
    }
}
exports.SocialDetector = SocialDetector;
exports.socialDetector = new SocialDetector();
//# sourceMappingURL=social-detector.js.map