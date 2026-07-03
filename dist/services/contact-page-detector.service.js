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
exports.contactPageDetectorService = exports.ContactPageDetectorService = void 0;
const logger_1 = require("../utils/logger");
class ContactPageDetectorService {
    constructor() {
        this.browserManager = null;
    }
    async detectContactPages(website) {
        const contactPages = [];
        const timeout = 15000;
        try {
            if (!this.browserManager) {
                this.browserManager = new (await Promise.resolve().then(() => __importStar(require('../scrapers/browser-manager')))).PlaywrightBrowser();
            }
            let url = website;
            if (!url.match(/^https?:\/\//i)) {
                url = 'https://' + url;
            }
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
                '/customer-service',
                '/support',
                '/help',
                '/inquiry',
                '/feedback',
                '/enquire',
                '/message-us',
            ];
            for (const path of contactPaths) {
                try {
                    const contactUrl = url.replace(/\/+$/, '') + path;
                    const { page } = await this.browserManager.initialize();
                    page.setDefaultTimeout(timeout);
                    const response = await page.goto(contactUrl, {
                        waitUntil: 'domcontentloaded',
                        timeout
                    });
                    if (response && response.status() === 200) {
                        const pageInfo = await this.analyzeContactPage(page);
                        contactPages.push({
                            url: contactUrl,
                            ...pageInfo,
                            extractionTime: 0,
                        });
                        await this.browserManager.close();
                        logger_1.logger.info(`Found contact page: ${contactUrl}`);
                    }
                    else {
                        await this.browserManager.close();
                    }
                }
                catch (error) {
                    try {
                        await this.browserManager?.close();
                    }
                    catch {
                    }
                }
            }
        }
        catch (error) {
            logger_1.logger.error(`Contact page detection failed for ${website}:`, error);
        }
        return contactPages;
    }
    async analyzeContactPage(page) {
        const result = {
            hasContactForm: false,
            hasEmail: false,
            hasPhone: false,
            hasAddress: false,
            formFields: [],
        };
        try {
            const pageInfo = await page.evaluate(() => {
                const text = document.body.innerText || '';
                const hasForm = document.querySelector('form') !== null;
                const formFields = [];
                document.querySelectorAll('input, textarea, select').forEach(el => {
                    const name = el.getAttribute('name') || '';
                    const placeholder = el.getAttribute('placeholder') || '';
                    const type = el.getAttribute('type') || '';
                    if (name)
                        formFields.push(name);
                    if (placeholder)
                        formFields.push(placeholder);
                    if (type === 'email')
                        result.hasEmail = true;
                    if (type === 'tel' || type === 'phone')
                        result.hasPhone = true;
                });
                if (text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i)) {
                    result.hasEmail = true;
                }
                if (text.match(/[\d\s\-\(\)]{10,}/)) {
                    result.hasPhone = true;
                }
                if (text.match(/address|locat(?:ion|ed|ion)/i)) {
                    result.hasAddress = true;
                }
                return {
                    hasForm,
                    formFields: [...new Set(formFields)],
                };
            });
            result.hasContactForm = pageInfo.hasForm;
            result.formFields = pageInfo.formFields;
        }
        catch (error) {
            logger_1.logger.warn(error instanceof Error ? error : new Error(String(error)), 'Failed to analyze contact page:');
        }
        return result;
    }
    async isContactPage(url) {
        try {
            if (!this.browserManager) {
                this.browserManager = new (await Promise.resolve().then(() => __importStar(require('../scrapers/browser-manager')))).PlaywrightBrowser();
            }
            const { page } = await this.browserManager.initialize();
            page.setDefaultTimeout(5000);
            const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 5000 });
            if (!response || response.status() !== 200) {
                await this.browserManager.close();
                return false;
            }
            const isContact = await page.evaluate(() => {
                const text = document.body.innerText || '';
                const title = document.title || '';
                const h1 = document.querySelector('h1')?.innerText || '';
                const contactKeywords = [
                    'contact',
                    'contact us',
                    'get in touch',
                    'reach us',
                    'inquiry',
                    'feedback',
                    'message',
                    'customer service',
                    'support',
                    'enquire',
                ];
                const allText = (text + ' ' + title + ' ' + h1).toLowerCase();
                return contactKeywords.some(keyword => allText.includes(keyword));
            });
            await this.browserManager.close();
            return isContact;
        }
        catch {
            return false;
        }
    }
}
exports.ContactPageDetectorService = ContactPageDetectorService;
exports.contactPageDetectorService = new ContactPageDetectorService();
//# sourceMappingURL=contact-page-detector.service.js.map