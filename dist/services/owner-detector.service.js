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
exports.ownerDetectorService = exports.OwnerDetectorService = void 0;
const logger_1 = require("../utils/logger");
class OwnerDetectorService {
    constructor() {
        this.browserManager = null;
    }
    async detectOwner(website) {
        const startTime = Date.now();
        const result = {
            ownerNames: [],
            founders: [],
            management: [],
            extractionTime: 0,
        };
        try {
            if (!this.browserManager) {
                this.browserManager = new (await Promise.resolve().then(() => __importStar(require('../scrapers/browser-manager')))).PlaywrightBrowser();
            }
            const { page } = await this.browserManager.initialize();
            page.setDefaultTimeout(15000);
            let url = website;
            if (!url.match(/^https?:\/\//i)) {
                url = 'https://' + url;
            }
            const aboutPage = await this.findAboutPage(page, url);
            const targetUrl = aboutPage || url;
            await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 15000 });
            await page.waitForTimeout(1000);
            const ownerData = await page.evaluate(() => {
                const text = document.body.innerText || '';
                const metaTitle = document.querySelector('title')?.innerText || '';
                const h1 = document.querySelector('h1')?.innerText || '';
                const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
                return {
                    text,
                    metaTitle,
                    h1,
                    metaDescription,
                };
            });
            await this.browserManager.close();
            const { founders, ceo, management } = this.parseOwnerNames(ownerData);
            result.founders = founders;
            result.ceo = ceo;
            result.management = management;
            result.ownerNames = [
                ...founders.map(f => f.name),
                ...management.map(m => m.name),
                ...(ceo ? [ceo.name] : []),
            ];
            result.ownerNames = [...new Set(result.ownerNames)];
        }
        catch (error) {
            logger_1.logger.error(`Owner detection failed for ${website}:`, error);
        }
        result.extractionTime = Date.now() - startTime;
        return result;
    }
    async findAboutPage(page, baseUrl) {
        const aboutPaths = [
            '/about',
            '/about-us',
            '/about-me',
            '/founders',
            '/team',
            '/our-team',
            '/company',
            '/leadership',
            '/executive-team',
            '/board',
            '/management',
        ];
        for (const path of aboutPaths) {
            try {
                const url = baseUrl.replace(/\/+$/, '') + path;
                const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 5000 });
                if (response && response.status() === 200) {
                    return url;
                }
            }
            catch {
                continue;
            }
        }
        return null;
    }
    parseOwnerNames(content) {
        const founders = [];
        const management = [];
        let ceo;
        const text = content.text + ' ' + content.metaTitle + ' ' + content.h1;
        const founderPatterns = [
            { regex: /founder[:\s]+([A-Z][a-z]+)/gi, role: 'Founder' },
            { regex: /founded by[:\s]+([A-Z][a-z]+)/gi, role: 'Founder' },
            { regex: /created by[:\s]+([A-Z][a-z]+)/gi, role: 'Founder' },
            { regex: /established by[:\s]+([A-Z][a-z]+)/gi, role: 'Founder' },
            { regex: /president[:\s]+([A-Z][a-z]+)/gi, role: 'President' },
            { regex: /chairman[:\s]+([A-Z][a-z]+)/gi, role: 'Chairman' },
            { regex: /ceo[:\s]+([A-Z][a-z]+)/gi, role: 'CEO' },
        ];
        for (const pattern of founderPatterns) {
            const matches = text.match(pattern.regex);
            if (matches) {
                for (const match of matches) {
                    const nameMatch = match.match(/[A-Z][a-z]+/);
                    if (nameMatch) {
                        const info = {
                            name: nameMatch[0],
                            role: pattern.role,
                            confidence: 0.8,
                            source: 'text_pattern',
                        };
                        if (pattern.role === 'CEO') {
                            ceo = info;
                        }
                        else if (pattern.role === 'Founder') {
                            founders.push(info);
                        }
                        else {
                            management.push(info);
                        }
                    }
                }
            }
        }
        const footerPattern = /copyright.*?©?\s*([A-Z][a-z]+)/gi;
        const footerMatches = text.match(footerPattern);
        if (footerMatches) {
            for (const match of footerMatches) {
                const nameMatch = match.match(/[A-Z][a-z]+/);
                if (nameMatch) {
                    const existing = founders.find(f => f.name === nameMatch[0]);
                    if (!existing) {
                        founders.push({
                            name: nameMatch[0],
                            role: 'Founder',
                            confidence: 0.6,
                            source: 'footer',
                        });
                    }
                }
            }
        }
        const seen = new Set();
        const uniqueFounders = [];
        for (const founder of founders) {
            if (!seen.has(founder.name)) {
                seen.add(founder.name);
                uniqueFounders.push(founder);
            }
        }
        return {
            founders: uniqueFounders,
            ceo,
            management,
        };
    }
    async extractFromAboutPage(content, _url) {
        const owners = [];
        const patterns = [
            /about\s+([A-Z][a-z]+)/gi,
            /([A-Z][a-z]+)\s+-\s+(founder|ceo|owner|president)/gi,
            /([A-Z][a-z]+)\s+is\s+a\s+(founder|ceo|owner|president)/gi,
        ];
        for (const pattern of patterns) {
            const matches = content.match(pattern);
            if (matches) {
                for (const match of matches) {
                    const nameMatch = match.match(/[A-Z][a-z]+/);
                    if (nameMatch) {
                        owners.push({
                            name: nameMatch[0],
                            role: 'Unknown',
                            confidence: 0.5,
                            source: 'about_page',
                        });
                    }
                }
            }
        }
        return owners;
    }
}
exports.OwnerDetectorService = OwnerDetectorService;
exports.ownerDetectorService = new OwnerDetectorService();
//# sourceMappingURL=owner-detector.service.js.map