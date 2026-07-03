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
exports.contactDetector = exports.ContactDetector = void 0;
const cheerio = __importStar(require("cheerio"));
const logger_1 = require("../utils/logger");
class ContactDetector {
    async detectContactInfo(html) {
        try {
            const $ = cheerio.load(html);
            const phoneDetected = this.detectPhone($);
            const emailDetected = this.detectEmail($);
            const contactForm = this.detectContactForm($);
            const googleMapsEmbed = this.detectGoogleMaps($);
            const officeAddress = this.detectAddress($);
            const whatsappButton = this.detectWhatsAppButton($);
            const contactMethods = [
                phoneDetected,
                emailDetected,
                contactForm,
                googleMapsEmbed,
                officeAddress,
                whatsappButton,
            ].filter(Boolean).length;
            const audit = {
                phoneDetected,
                emailDetected,
                contactForm,
                googleMapsEmbed,
                officeAddress,
                whatsappButton,
                contactMethods,
            };
            logger_1.logger.info(`Contact detected: methods=${contactMethods}, form=${contactForm}`);
            return audit;
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to detect contact info:');
            return this.getDefaultContactAudit();
        }
    }
    detectPhone($) {
        const bodyText = $('body').text();
        const phonePatterns = [
            /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
            /\b\d{10}\b/,
            /\+\d{1,3}\s?\d{6,}/,
        ];
        for (const pattern of phonePatterns) {
            if (pattern.test(bodyText)) {
                return true;
            }
        }
        const telLinks = $('a[href^="tel:"]');
        return telLinks.length > 0;
    }
    detectEmail($) {
        const bodyText = $('body').text();
        const emailPattern = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
        if (emailPattern.test(bodyText)) {
            return true;
        }
        const mailtoLinks = $('a[href^="mailto:"]');
        return mailtoLinks.length > 0;
    }
    detectContactForm($) {
        const forms = $('form');
        if (forms.length === 0) {
            return false;
        }
        let hasContactForm = false;
        forms.each((_, form) => {
            const formHtml = $(form).html() || '';
            const formText = $(form).text().toLowerCase();
            const hasNameField = formHtml.includes('name') || $(form).find('input[name*="name"]').length > 0;
            const hasEmailField = formHtml.includes('email') || $(form).find('input[type="email"]').length > 0;
            const hasMessageField = formHtml.includes('message') || $(form).find('textarea').length > 0;
            const isContactForm = formText.includes('contact') ||
                formText.includes('get in touch') ||
                formText.includes('send message');
            if ((hasNameField && hasEmailField && hasMessageField) || isContactForm) {
                hasContactForm = true;
            }
        });
        return hasContactForm;
    }
    detectGoogleMaps($) {
        const iframes = $('iframe');
        for (let i = 0; i < iframes.length; i++) {
            const src = $(iframes[i]).attr('src') || '';
            if (src.includes('google.com/maps') || src.includes('maps.google.com')) {
                return true;
            }
        }
        const links = $('a[href*="google.com/maps"], a[href*="maps.google.com"]');
        return links.length > 0;
    }
    detectAddress($) {
        const addressSelectors = [
            '[itemprop="address"]',
            '.address',
            '#address',
            '.location',
            '.office-address',
        ];
        for (const selector of addressSelectors) {
            if ($(selector).length > 0) {
                return true;
            }
        }
        const bodyText = $('body').text();
        const addressPatterns = [
            /\d+\s+[A-Z][a-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)/i,
            /\b(Street|Avenue|Road|Boulevard)\b.*\b(City|Town|Village)\b/i,
        ];
        for (const pattern of addressPatterns) {
            if (pattern.test(bodyText)) {
                return true;
            }
        }
        return false;
    }
    detectWhatsAppButton($) {
        const whatsappLinks = $('a[href*="wa.me"], a[href*="whatsapp.com"], a[href*="api.whatsapp.com"]');
        if (whatsappLinks.length > 0) {
            return true;
        }
        const whatsappClasses = $('.whatsapp, .whatsapp-button, .wa-button, [class*="whatsapp"]');
        return whatsappClasses.length > 0;
    }
    getDefaultContactAudit() {
        return {
            phoneDetected: false,
            emailDetected: false,
            contactForm: false,
            googleMapsEmbed: false,
            officeAddress: false,
            whatsappButton: false,
            contactMethods: 0,
        };
    }
}
exports.ContactDetector = ContactDetector;
exports.contactDetector = new ContactDetector();
//# sourceMappingURL=contact-detector.js.map