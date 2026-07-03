"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebsiteEnrichmentService = void 0;
const logger_1 = require("../utils/logger");
const browser_manager_1 = require("../core/scraper-engine/browser-manager");
const website_cache_service_1 = require("./website-cache.service");
const ENRICHMENT_PATHS = [
    '/',
    '/about',
    '/about-us',
    '/contact',
    '/contact-us',
    '/team',
];
const SOCIAL_PATTERNS = {
    facebook: /facebook\.com\/([^\/\?#]+)/i,
    instagram: /instagram\.com\/([^\/\?#]+)/i,
    linkedin: /linkedin\.com\/(company|in)\/([^\/\?#]+)/i,
    youtube: /(youtube\.com|youtu\.be)\//i,
    twitter: /(twitter\.com|x\.com)\/([^\/\?#]+)/i,
    whatsapp: /(wa\.me|whatsapp\.com)\/([^\/\?#]+)/i,
};
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
class WebsiteEnrichmentService {
    constructor() {
        this.REQUEST_TIMEOUT = 15000;
        this.MAX_PAGES = 7;
    }
    async enrichWebsite(domain) {
        const cached = website_cache_service_1.websiteCache.get(domain);
        if (cached) {
            logger_1.logger.debug({ domain }, 'WebsiteEnrichment: Using cached result');
            return {
                emails: cached.emails,
                phones: cached.phones,
                socialLinks: cached.socialLinks,
                companyName: cached.companyName,
                copyright: cached.copyright,
                hasContactForm: cached.hasContactForm,
                hasContactPage: cached.hasContactPage,
                pagesCrawled: cached.pagesCrawled,
                success: true,
            };
        }
        const result = await this.crawlAndExtract(domain);
        if (result.success) {
            const cacheData = {
                emails: result.emails,
                phones: result.phones,
                socialLinks: result.socialLinks,
                companyName: result.companyName,
                copyright: result.copyright,
                hasContactForm: result.hasContactForm,
                hasContactPage: result.hasContactPage,
                pagesCrawled: result.pagesCrawled,
                extractedAt: new Date().toISOString(),
            };
            website_cache_service_1.websiteCache.set(domain, cacheData);
        }
        return result;
    }
    async crawlAndExtract(domain) {
        const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
        let page = null;
        const result = {
            emails: [],
            phones: [],
            socialLinks: {},
            pagesCrawled: [],
            hasContactForm: false,
            hasContactPage: false,
            success: false,
        };
        try {
            const acquired = await browser_manager_1.browserManager.acquire('website-enrich');
            page = acquired.page;
            const visited = new Set();
            const toVisit = ENRICHMENT_PATHS.map(p => this.joinUrl(baseUrl, p));
            while (toVisit.length > 0 && result.pagesCrawled.length < this.MAX_PAGES) {
                const url = toVisit.shift();
                if (visited.has(url))
                    continue;
                visited.add(url);
                try {
                    await page.goto(url, {
                        waitUntil: 'domcontentloaded',
                        timeout: this.REQUEST_TIMEOUT,
                    });
                    const pageText = await page.evaluate(() => document.body?.innerText || '');
                    const pageHtml = await page.evaluate(() => document.documentElement?.outerHTML || '');
                    const pageLinks = await page.evaluate(() => {
                        const links = [];
                        document.querySelectorAll('a[href]').forEach(el => {
                            const href = el.href || '';
                            if (href && !href.startsWith('javascript:'))
                                links.push(href);
                        });
                        return links;
                    });
                    result.pagesCrawled.push(url);
                    this.extractEmails(pageText, pageHtml, result);
                    this.extractPhones(pageText, pageHtml, result);
                    this.extractSocialLinks(pageLinks, result);
                    this.extractCompanyName(pageText, pageHtml, result);
                    this.extractCopyright(pageText, result);
                    if (this.detectContactForm(pageHtml)) {
                        result.hasContactForm = true;
                    }
                    if (this.isContactPage(url)) {
                        result.hasContactPage = true;
                    }
                    const footerLinks = await page.evaluate(() => {
                        const links = [];
                        const footer = document.querySelector('footer') || document.querySelector('[class*="footer"]') || document.querySelector('[id*="footer"]');
                        if (footer) {
                            footer.querySelectorAll('a[href]').forEach(el => {
                                const href = el.href || el.getAttribute('href') || '';
                                if (href && !href.startsWith('javascript:') && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
                                    links.push(href);
                                }
                            });
                        }
                        return [...new Set(links)];
                    });
                    for (const link of footerLinks) {
                        const absUrl = this.toAbsoluteUrl(baseUrl, link);
                        if (absUrl && !visited.has(absUrl) && this.isSameDomain(absUrl, baseUrl)) {
                            const isRelevant = this.isRelevantPage(absUrl);
                            if (isRelevant && !toVisit.includes(absUrl)) {
                                toVisit.push(absUrl);
                            }
                        }
                    }
                }
                catch {
                    continue;
                }
            }
            result.emails = [...new Set(result.emails)];
            result.phones = [...new Set(result.phones)];
            for (const [platform, url] of Object.entries(result.socialLinks)) {
                if (!url)
                    delete result.socialLinks[platform];
            }
            result.success = result.pagesCrawled.length > 0;
        }
        catch (err) {
            result.error = err instanceof Error ? err.message : String(err);
            logger_1.logger.error({ domain, err: result.error }, 'WebsiteEnrichment: Failed');
        }
        finally {
            if (page) {
                await browser_manager_1.browserManager.release(page, 'website-enrich').catch(() => { });
            }
        }
        return result;
    }
    extractEmails(_text, html, result) {
        const matches = html.match(EMAIL_PATTERN) || [];
        for (const email of matches) {
            const lower = email.toLowerCase();
            if (!lower.endsWith('.png') && !lower.endsWith('.jpg') && !lower.endsWith('.svg') && !lower.endsWith('.css') && !lower.endsWith('.js')) {
                if (!result.emails.includes(lower)) {
                    result.emails.push(lower);
                }
            }
        }
    }
    extractPhones(text, html, result) {
        const telMatches = html.match(/tel:([+\d]+)/g);
        if (telMatches) {
            for (const tel of telMatches) {
                const phone = tel.replace('tel:', '').trim();
                if (phone && !result.phones.includes(phone)) {
                    result.phones.push(phone);
                }
            }
        }
        const textPhones = text.match(/[\+]?[\d\s\-\(\)]{10,20}/g);
        if (textPhones) {
            for (const phone of textPhones) {
                const cleaned = phone.replace(/[^\d+]/g, '');
                if (cleaned.length >= 10 && !result.phones.includes(cleaned)) {
                    result.phones.push(cleaned);
                }
            }
        }
    }
    extractSocialLinks(links, result) {
        for (const link of links) {
            for (const [platform, pattern] of Object.entries(SOCIAL_PATTERNS)) {
                if (pattern.test(link) && !result.socialLinks[platform]) {
                    result.socialLinks[platform] = link;
                }
            }
        }
    }
    extractCompanyName(_text, html, result) {
        if (result.companyName)
            return;
        const ogTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i);
        if (ogTitleMatch) {
            result.companyName = ogTitleMatch[1].trim();
            return;
        }
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch) {
            const title = titleMatch[1].trim();
            const cleaned = title.replace(/\s*[|–—-]\s*.*$/, '').trim();
            if (cleaned.length > 0 && cleaned.length < 100) {
                result.companyName = cleaned;
            }
        }
    }
    extractCopyright(text, result) {
        const match = text.match(/(?:copyright|©)\s*(?:20\d{2})\s*(?:by\s*)?([^\n]{2,60})/i);
        if (match) {
            result.copyright = match[0].trim();
        }
    }
    detectContactForm(html) {
        const formIndicators = [
            'contact-form',
            'contactform',
            'wpcf7-form',
            'gform_wrapper',
            'contactForm',
            'contact_form',
            'data-form',
        ];
        for (const indicator of formIndicators) {
            if (html.includes(indicator))
                return true;
        }
        return false;
    }
    isContactPage(url) {
        const path = url.toLowerCase();
        return path.includes('/contact') || path.includes('/support') || path.includes('/enquiry');
    }
    isRelevantPage(url) {
        const path = url.toLowerCase();
        return path.includes('/contact') || path.includes('/about') || path.includes('/team') || path.includes('/service') || path.includes('/support');
    }
    isSameDomain(url, baseUrl) {
        try {
            const u = new URL(url);
            const b = new URL(baseUrl);
            return u.hostname === b.hostname;
        }
        catch {
            return false;
        }
    }
    joinUrl(base, path) {
        try {
            const baseUrl = new URL(base);
            return new URL(path, baseUrl.origin).href;
        }
        catch {
            return base + path;
        }
    }
    toAbsoluteUrl(base, href) {
        try {
            if (href.startsWith('http'))
                return href;
            if (href.startsWith('/')) {
                const baseUrl = new URL(base);
                return `${baseUrl.origin}${href}`;
            }
            return null;
        }
        catch {
            return null;
        }
    }
}
exports.WebsiteEnrichmentService = WebsiteEnrichmentService;
//# sourceMappingURL=website-enrichment.service.js.map