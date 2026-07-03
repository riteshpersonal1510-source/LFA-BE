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
exports.contactExtractorService = exports.ContactExtractorService = void 0;
const logger_1 = require("../utils/logger");
const contact_extraction_1 = require("../utils/contact-extraction");
const browser_manager_1 = require("../scrapers/browser-manager");
class ContactExtractorService {
    constructor() {
        this.browserManager = null;
        this.browserManager = null;
    }
    async extractContacts(website, options = {}) {
        const startTime = Date.now();
        const result = {
            emails: [],
            phones: [],
            socialLinks: {},
            contactPages: [],
            ownerNames: [],
            websitePagesCrawled: [],
            extractionStatus: 'success',
            extractionTime: 0,
        };
        try {
            let normalizedUrl = this.normalizeUrl(website);
            if (!normalizedUrl) {
                result.extractionStatus = 'failed';
                result.extractionError = 'Invalid website URL';
                return result;
            }
            if (!this.browserManager) {
                this.browserManager = new browser_manager_1.PlaywrightBrowser();
            }
            const homepageResult = await this.extractFromPage(normalizedUrl, options);
            result.emails.push(...homepageResult.emails);
            result.phones.push(...homepageResult.phones);
            result.socialLinks = { ...result.socialLinks, ...homepageResult.socialLinks };
            result.contactPages.push(...homepageResult.contactPages);
            result.ownerNames.push(...homepageResult.ownerNames);
            result.websitePagesCrawled.push(normalizedUrl);
            const contactPageUrl = await this.detectContactPage(normalizedUrl);
            if (contactPageUrl) {
                const contactResult = await this.extractFromPage(contactPageUrl, options);
                result.emails.push(...contactResult.emails);
                result.phones.push(...contactResult.phones);
                result.socialLinks = { ...result.socialLinks, ...contactResult.socialLinks };
                result.ownerNames.push(...contactResult.ownerNames);
                result.websitePagesCrawled.push(contactPageUrl);
            }
            const aboutPageUrl = await this.detectAboutPage(normalizedUrl);
            if (aboutPageUrl && aboutPageUrl !== contactPageUrl) {
                const aboutResult = await this.extractFromPage(aboutPageUrl, options);
                result.ownerNames.push(...aboutResult.ownerNames);
                result.websitePagesCrawled.push(aboutPageUrl);
            }
            result.emails = this.deduplicate(result.emails);
            result.phones = this.deduplicate(result.phones).map(contact_extraction_1.normalizePhone);
            result.extractionTime = Date.now() - startTime;
            if (result.emails.length === 0 && result.phones.length === 0) {
                result.extractionStatus = 'partial';
            }
            logger_1.logger.info(`Contact extraction completed for ${website}: ${result.emails.length} emails, ${result.phones.length} phones`);
        }
        catch (error) {
            logger_1.logger.error(`Contact extraction failed for ${website}:`, error);
            result.extractionStatus = 'failed';
            result.extractionError = error.message;
        }
        return result;
    }
    async bulkExtractContacts(leads, options = {}) {
        const results = [];
        let successful = 0;
        let failed = 0;
        const batchSize = 3;
        for (let i = 0; i < leads.length; i += batchSize) {
            const batch = leads.slice(i, i + batchSize);
            const batchPromises = batch.map(async (lead) => {
                if (!lead.website) {
                    failed++;
                    return { leadId: lead.id, result: { extractionStatus: 'failed', extractionError: 'No website', emails: [], phones: [], socialLinks: {}, contactPages: [], ownerNames: [], websitePagesCrawled: [], extractionTime: 0 } };
                }
                try {
                    const result = await this.extractContacts(lead.website, options);
                    if (result.extractionStatus === 'success') {
                        successful++;
                    }
                    else {
                        failed++;
                    }
                    return { leadId: lead.id, result };
                }
                catch (error) {
                    failed++;
                    return {
                        leadId: lead.id,
                        result: {
                            extractionStatus: 'failed',
                            extractionError: error instanceof Error ? error.message : 'Unknown error',
                            emails: [],
                            phones: [],
                            socialLinks: {},
                            contactPages: [],
                            ownerNames: [],
                            websitePagesCrawled: [],
                            extractionTime: 0,
                        },
                    };
                }
            });
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
        }
        return {
            totalProcessed: leads.length,
            successful,
            failed,
            results,
        };
    }
    async extractFromPage(url, options = {}) {
        const result = {
            emails: [],
            phones: [],
            socialLinks: {},
            ownerNames: [],
            contactPages: [],
        };
        try {
            if (!this.browserManager) {
                this.browserManager = new browser_manager_1.PlaywrightBrowser();
            }
            const { page } = await this.browserManager.initialize();
            page.setDefaultTimeout(options.timeout || 15000);
            await page.goto(url, { waitUntil: 'networkidle', timeout: options.timeout || 15000 });
            const content = await page.content();
            const $ = await Promise.resolve().then(() => __importStar(require('cheerio'))).then(c => c.load(content));
            result.emails.push(...(0, contact_extraction_1.extractEmails)(content));
            result.phones.push(...(0, contact_extraction_1.extractPhones)(content));
            const socialLinks = await this.extractSocialLinks(page, url);
            result.socialLinks = socialLinks;
            result.ownerNames.push(...this.extractOwnerNames($, content));
            await this.browserManager.close();
        }
        catch (error) {
            logger_1.logger.warn(`Failed to extract from ${url}:`, error.message);
        }
        return result;
    }
    async detectContactPage(baseUrl) {
        const contactPaths = [
            '/contact',
            '/contact-us',
            '/contact-us/',
            '/contacto',
            '/contactar',
            '/get-in-touch',
            '/reach-us',
            '/contact-form',
            '/contact-me',
        ];
        for (const path of contactPaths) {
            try {
                const url = baseUrl.replace(/\/+$/, '') + path;
                if (!this.browserManager) {
                    this.browserManager = new browser_manager_1.PlaywrightBrowser();
                }
                if (!this.browserManager)
                    return null;
                const { page } = await this.browserManager.initialize();
                page.setDefaultTimeout(5000);
                try {
                    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 5000 });
                    if (response?.status() === 200) {
                        await this.browserManager.close();
                        return url;
                    }
                }
                catch {
                }
                await this.browserManager.close();
            }
            catch {
            }
        }
        return null;
    }
    async detectAboutPage(baseUrl) {
        const aboutPaths = [
            '/about',
            '/about-us',
            '/about-us/',
            '/about-me',
            '/about/company',
            '/company',
            '/team',
            '/founders',
            '/our-team',
        ];
        for (const path of aboutPaths) {
            try {
                const url = baseUrl.replace(/\/+$/, '') + path;
                if (!this.browserManager) {
                    this.browserManager = new browser_manager_1.PlaywrightBrowser();
                }
                if (!this.browserManager)
                    return null;
                const { page } = await this.browserManager.initialize();
                page.setDefaultTimeout(5000);
                try {
                    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 5000 });
                    if (response?.status() === 200) {
                        await this.browserManager.close();
                        return url;
                    }
                }
                catch {
                }
                await this.browserManager.close();
            }
            catch {
            }
        }
        return null;
    }
    async extractSocialLinks(page, _baseUrl) {
        const socialLinks = {};
        try {
            const content = await page.content();
            const $ = await Promise.resolve().then(() => __importStar(require('cheerio'))).then(c => c.load(content));
            $('a').each((_, el) => {
                const href = $(el).attr('href') || '';
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
            });
        }
        catch (error) {
            logger_1.logger.warn(error instanceof Error ? error : new Error(String(error)), 'Failed to extract social links:');
        }
        return socialLinks;
    }
    extractOwnerNames($, content) {
        const ownerNames = [];
        const patterns = [
            /founder[:\s]+([A-Z][a-z]+)/gi,
            /owner[:\s]+([A-Z][a-z]+)/gi,
            /ceo[:\s]+([A-Z][a-z]+)/gi,
            /founded by[:\s]+([A-Z][a-z]+)/gi,
        ];
        for (const pattern of patterns) {
            const matches = content.match(pattern);
            if (matches) {
                for (const match of matches) {
                    const nameMatch = match.match(/[A-Z][a-z]+/);
                    if (nameMatch) {
                        ownerNames.push(nameMatch[0]);
                    }
                }
            }
        }
        const footer = $('footer').text() || '';
        const footerPatterns = [
            /copyright.*?([A-Z][a-z]+)/gi,
            /©([A-Z][a-z]+)/gi,
        ];
        for (const pattern of footerPatterns) {
            const matches = footer.match(pattern);
            if (matches) {
                for (const match of matches) {
                    const nameMatch = match.match(/[A-Z][a-z]+/);
                    if (nameMatch) {
                        ownerNames.push(nameMatch[0]);
                    }
                }
            }
        }
        return this.deduplicate(ownerNames).slice(0, 5);
    }
    normalizeUrl(url) {
        if (!url || typeof url !== 'string') {
            return null;
        }
        let normalized = url.trim();
        if (!normalized.match(/^https?:\/\//i)) {
            normalized = 'https://' + normalized;
        }
        normalized = normalized.replace(/\/+$/, '');
        try {
            new URL(normalized);
        }
        catch {
            return null;
        }
        return normalized;
    }
    deduplicate(arr) {
        return [...new Set(arr)];
    }
}
exports.ContactExtractorService = ContactExtractorService;
exports.contactExtractorService = new ContactExtractorService();
//# sourceMappingURL=contact-extractor.service.js.map