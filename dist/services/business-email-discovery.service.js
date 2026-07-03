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
exports.businessEmailDiscoveryService = exports.BusinessEmailDiscoveryService = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const Lead_1 = require("../models/Lead");
const EmailScanCache_1 = require("../models/EmailScanCache");
const browser_pool_service_1 = require("./browser-pool.service");
const email_discovery_queue_service_1 = require("./email-discovery-queue.service");
const logger_1 = require("../utils/logger");
const socket_manager_1 = require("../modules/automation-monitor/socket-manager");
const urlClassifier_service_1 = require("../modules/leads/services/urlClassifier.service");
const PRIORITY_PAGES = [
    '/contact', '/contact-us', '/contactus', '/about', '/about-us',
    '/support', '/help', '/faq', '/privacy', '/privacy-policy',
    '/terms', '/terms-of-service', '/terms-and-conditions',
    '/team', '/our-team', '/careers', '/jobs',
    '/footer', '/services', '/locations', '/branches',
];
const FAKE_EMAIL_PATTERNS = [
    /^test@/i, /^your@/i, /^dummy@/i, /^placeholder@/i, /^example@/i,
    /@example\./i, /@test\./i, /@domain\./i, /@yourcompany\./i,
    /^admin@example\./i, /^info@example\./i, /^contact@example\./i,
    /^support@example\./i, /^sales@example\./i, /noreply@/i, /no-reply@/i,
];
const FAKE_DOMAINS = [
    'example.com', 'test.com', 'domain.com', 'yourcompany.com',
    'yourdomain.com', 'sample.com', 'demo.com', 'test.org', 'example.org',
];
const PRIORITY_PREFIXES = ['info', 'contact', 'hello', 'sales', 'office', 'support', 'admin', 'marketing', 'hr'];
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const REQUEST_TIMEOUT = 5000;
class BusinessEmailDiscoveryService {
    constructor() {
        this.httpClient = axios_1.default.create({
            timeout: REQUEST_TIMEOUT,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
            },
            maxRedirects: 3,
            validateStatus: (status) => status < 500,
        });
    }
    normalizeUrl(rawUrl) {
        let url = rawUrl.trim().toLowerCase();
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = `https://${url}`;
        }
        try {
            const parsed = new URL(url);
            return parsed.origin;
        }
        catch {
            return url.replace(/\/+$/, '');
        }
    }
    getNormalizedDomain(url) {
        try {
            const parsed = new URL(url);
            return parsed.hostname.replace(/^www\./, '');
        }
        catch {
            return url;
        }
    }
    isSocialOrDirectoryUrl(url) {
        const classification = (0, urlClassifier_service_1.classifyWebsiteUrl)(url);
        return !classification.hasRealWebsite;
    }
    isFakeEmail(email) {
        const lower = email.toLowerCase();
        if (FAKE_EMAIL_PATTERNS.some(pattern => pattern.test(lower)))
            return true;
        const domain = lower.split('@')[1];
        if (domain && FAKE_DOMAINS.includes(domain))
            return true;
        return false;
    }
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!re.test(email))
            return false;
        if (this.isFakeEmail(email))
            return false;
        const domain = email.split('@')[1];
        if (domain && domain.split('.').length < 2)
            return false;
        return true;
    }
    extractEmailsFromHtml(html, sourcePage) {
        const $ = cheerio.load(html);
        const emails = [];
        const seen = new Set();
        const addEmail = (email, type, confidence) => {
            const clean = email.trim().toLowerCase();
            if (!this.isValidEmail(clean))
                return;
            if (seen.has(clean))
                return;
            seen.add(clean);
            emails.push({ email: clean, type, sourcePage, confidence, verified: false });
        };
        $('[href^="mailto:"]').each((_, el) => {
            const href = $(el).attr('href') || '';
            const email = href.replace('mailto:', '').split('?')[0].trim();
            if (email)
                addEmail(email, 'mailto', 95);
            const linkText = $(el).text().trim();
            if (linkText && linkText.includes('@') && linkText !== email) {
                addEmail(linkText, 'mailto_link_text', 90);
            }
        });
        $('meta[name="email"], meta[property="email"]').each((_, el) => {
            const content = $(el).attr('content') || '';
            if (content)
                addEmail(content, 'meta_tag', 85);
        });
        $('script[type="application/ld+json"]').each((_, el) => {
            try {
                const json = JSON.parse($(el).text());
                const jsonStr = JSON.stringify(json);
                const jsonMatches = jsonStr.match(EMAIL_REGEX) || [];
                for (const m of jsonMatches)
                    addEmail(m, 'json_ld', 80);
            }
            catch { }
        });
        $('[itemtype*="schema.org"]').each((_, el) => {
            const itemText = $(el).text();
            const itemMatches = itemText.match(EMAIL_REGEX) || [];
            for (const m of itemMatches)
                addEmail(m, 'schema_org', 75);
        });
        $('[class*="contact"], [id*="contact"]').each((_, el) => {
            const contactText = $(el).text();
            const contactMatches = contactText.match(EMAIL_REGEX) || [];
            for (const m of contactMatches)
                addEmail(m, 'contact_section', 80);
        });
        $('[class*="footer"], [id*="footer"]').each((_, el) => {
            const footerText = $(el).text();
            const footerMatches = footerText.match(EMAIL_REGEX) || [];
            for (const m of footerMatches)
                addEmail(m, 'footer', 70);
        });
        const text = $('body').text();
        const textMatches = text.match(EMAIL_REGEX) || [];
        for (const m of textMatches)
            addEmail(m, 'visible_text', 60);
        return emails;
    }
    selectPrimaryEmail(emails) {
        if (emails.length === 0)
            return '';
        const priorityMap = {};
        PRIORITY_PREFIXES.forEach((prefix, index) => { priorityMap[prefix] = index; });
        const scored = emails.map(e => {
            const localPart = e.email.split('@')[0].toLowerCase();
            const prefixScore = priorityMap[localPart] !== undefined ? priorityMap[localPart] : 999;
            return { ...e, prefixScore };
        });
        scored.sort((a, b) => {
            if (a.confidence !== b.confidence)
                return b.confidence - a.confidence;
            return a.prefixScore - b.prefixScore;
        });
        return scored[0].email;
    }
    async checkCache(leadId, website, baseUrl) {
        const normalizedDomain = this.getNormalizedDomain(website);
        const cached = await EmailScanCache_1.EmailScanCache.findOne({ normalizedDomain });
        if (cached && cached.lastScanAt && (Date.now() - cached.lastScanAt.getTime()) < 7 * 24 * 60 * 60 * 1000) {
            const discoveredEmails = cached.emails.map(e => ({
                email: e,
                type: 'cached',
                sourcePage: '/',
                confidence: 100,
                verified: false,
            }));
            const updateData = {
                discoveredEmails,
                primaryEmail: cached.primaryEmail,
                emailCount: cached.emailCount,
                lastEmailScan: new Date(),
                emailDiscoveryStatus: 'completed',
                emailDiscoveryError: null,
                emailDiscoveryRetries: 0,
            };
            if (cached.primaryEmail) {
                const lead = await Lead_1.Lead.findById(leadId).select('email');
                if (lead && !lead.email) {
                    updateData.email = cached.primaryEmail;
                }
            }
            await Lead_1.Lead.findByIdAndUpdate(leadId, { $set: updateData });
            logger_1.logger.info({
                leadId,
                website: baseUrl,
                emailsFound: cached.emailCount,
                primaryEmail: cached.primaryEmail,
                cacheHit: true,
            }, 'EmailDiscovery: Cache hit');
            return {
                discoveredEmails,
                primaryEmail: cached.primaryEmail,
                emailCount: cached.emailCount,
                success: true,
                fromCache: true,
                method: 'cache',
                durationMs: 0,
            };
        }
        return null;
    }
    async saveToCache(website, emails, primaryEmail) {
        try {
            const normalizedDomain = this.getNormalizedDomain(website);
            await EmailScanCache_1.EmailScanCache.findOneAndUpdate({ normalizedDomain }, {
                $set: {
                    normalizedDomain,
                    emails: emails.map(e => e.email),
                    primaryEmail,
                    emailCount: emails.length,
                    lastScanAt: new Date(),
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            }, { upsert: true });
        }
        catch (err) {
            logger_1.logger.error({ err: err instanceof Error ? err.message : String(err) }, 'EmailDiscovery: Failed to save cache');
        }
    }
    async fetchWithAxios(url) {
        try {
            const response = await this.httpClient.get(url, {
                responseType: 'text',
                timeout: REQUEST_TIMEOUT,
            });
            return {
                html: typeof response.data === 'string' ? response.data : String(response.data),
                error: null,
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return { html: null, error: message };
        }
    }
    async fetchWithPlaywright(url) {
        try {
            const { page } = await browser_pool_service_1.browserPool.acquire('email-discovery');
            await page.setViewportSize({ width: 1280, height: 800 });
            await page.route('**/*', (route) => {
                const resourceType = route.request().resourceType();
                if (['image', 'font', 'stylesheet', 'media'].includes(resourceType)) {
                    return route.abort();
                }
                return route.continue();
            });
            await page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: REQUEST_TIMEOUT,
            });
            const html = await page.content();
            await browser_pool_service_1.browserPool.release(page, 'email-discovery');
            return { html, error: null };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return { html: null, error: message };
        }
    }
    async extractEmailsWithPlaywright(url) {
        const { html, error: pwError } = await this.fetchWithPlaywright(url);
        if (html) {
            return this.extractEmailsFromHtml(html, '/');
        }
        logger_1.logger.warn({ url, err: pwError }, 'EmailDiscovery: Playwright fallback failed');
        return [];
    }
    async extractEmailsFromHomepage(url) {
        const { html } = await this.fetchWithAxios(url);
        if (html) {
            return { emails: this.extractEmailsFromHtml(html, '/'), method: 'homepage', axiosFailed: false };
        }
        return { emails: [], method: 'homepage_failed', axiosFailed: true };
    }
    async extractEmailsFromPages(baseUrl, paths) {
        const results = await Promise.allSettled(paths.map(path => this.fetchWithAxios(`${baseUrl}${path}`)));
        const allEmails = [];
        const seen = new Set();
        results.forEach((result, i) => {
            if (result.status === 'fulfilled' && result.value.html) {
                const pageEmails = this.extractEmailsFromHtml(result.value.html, paths[i]);
                for (const e of pageEmails) {
                    if (!seen.has(e.email)) {
                        seen.add(e.email);
                        allEmails.push(e);
                    }
                }
            }
        });
        return allEmails;
    }
    async updateLeadWithEmails(leadId, allEmails, primaryEmail, status, error) {
        const updateData = {
            discoveredEmails: allEmails,
            primaryEmail,
            emailCount: allEmails.length,
            lastEmailScan: new Date(),
            emailDiscoveryStatus: status,
        };
        if (error) {
            updateData.emailDiscoveryError = error;
        }
        else {
            updateData.emailDiscoveryError = null;
            updateData.emailDiscoveryRetries = 0;
        }
        if (primaryEmail) {
            const lead = await Lead_1.Lead.findById(leadId).select('email');
            if (lead && !lead.email) {
                updateData.email = primaryEmail;
            }
        }
        await Lead_1.Lead.findByIdAndUpdate(leadId, { $set: updateData });
    }
    async discoverEmailsForLead(leadId) {
        const startTime = Date.now();
        const lead = await Lead_1.Lead.findById(leadId);
        if (!lead) {
            return { discoveredEmails: [], primaryEmail: '', emailCount: 0, success: false, error: 'Lead not found', durationMs: Date.now() - startTime };
        }
        if (!lead.hasWebsite || !lead.website) {
            return { discoveredEmails: [], primaryEmail: '', emailCount: 0, success: false, error: 'Lead has no website', durationMs: Date.now() - startTime };
        }
        const website = lead.website;
        if (this.isSocialOrDirectoryUrl(website)) {
            await Lead_1.Lead.findByIdAndUpdate(leadId, {
                $set: { emailDiscoveryStatus: 'skipped', lastEmailScan: new Date() },
            });
            return { discoveredEmails: [], primaryEmail: '', emailCount: 0, success: true, error: 'Social/directory website skipped', durationMs: Date.now() - startTime };
        }
        const baseUrl = this.normalizeUrl(website);
        const cached = await this.checkCache(leadId, website, baseUrl);
        if (cached)
            return cached;
        await Lead_1.Lead.findByIdAndUpdate(leadId, {
            $set: { emailDiscoveryStatus: 'scanning' },
        });
        (0, socket_manager_1.emitEmailDiscoveryUpdate)(leadId, { status: 'scanning' });
        const allEmails = [];
        const seenEmails = new Set();
        const addUniqueEmails = (newEmails) => {
            for (const e of newEmails) {
                if (!seenEmails.has(e.email)) {
                    seenEmails.add(e.email);
                    allEmails.push(e);
                }
            }
        };
        try {
            const { emails: homepageEmails, axiosFailed } = await this.extractEmailsFromHomepage(baseUrl);
            addUniqueEmails(homepageEmails);
            if (allEmails.length > 0) {
                const primaryEmail = this.selectPrimaryEmail(allEmails);
                await this.updateLeadWithEmails(leadId, allEmails, primaryEmail, 'completed');
                await this.saveToCache(website, allEmails, primaryEmail);
                const durationMs = Date.now() - startTime;
                logger_1.logger.info({
                    leadId, website: baseUrl, emailsFound: allEmails.length, primaryEmail,
                    method: 'homepage', durationMs, cacheHit: false,
                }, 'EmailDiscovery: Completed (homepage)');
                (0, socket_manager_1.emitEmailDiscoveryUpdate)(leadId, { status: 'completed', primaryEmail, emailCount: allEmails.length });
                return { discoveredEmails: allEmails, primaryEmail, emailCount: allEmails.length, success: true, method: 'homepage', durationMs };
            }
            const secondaryEmails = await this.extractEmailsFromPages(baseUrl, PRIORITY_PAGES);
            addUniqueEmails(secondaryEmails);
            if (allEmails.length > 0) {
                const primaryEmail = this.selectPrimaryEmail(allEmails);
                await this.updateLeadWithEmails(leadId, allEmails, primaryEmail, 'completed');
                await this.saveToCache(website, allEmails, primaryEmail);
                const durationMs = Date.now() - startTime;
                logger_1.logger.info({
                    leadId, website: baseUrl, emailsFound: allEmails.length, primaryEmail,
                    method: 'secondary_pages', durationMs, cacheHit: false,
                }, 'EmailDiscovery: Completed (secondary pages)');
                (0, socket_manager_1.emitEmailDiscoveryUpdate)(leadId, { status: 'completed', primaryEmail, emailCount: allEmails.length });
                return { discoveredEmails: allEmails, primaryEmail, emailCount: allEmails.length, success: true, method: 'secondary_pages', durationMs };
            }
            if (axiosFailed) {
                const pwEmails = await this.extractEmailsWithPlaywright(baseUrl);
                addUniqueEmails(pwEmails);
                if (allEmails.length > 0) {
                    const primaryEmail = this.selectPrimaryEmail(allEmails);
                    await this.updateLeadWithEmails(leadId, allEmails, primaryEmail, 'completed');
                    await this.saveToCache(website, allEmails, primaryEmail);
                    const durationMs = Date.now() - startTime;
                    logger_1.logger.info({
                        leadId, website: baseUrl, emailsFound: allEmails.length, primaryEmail,
                        method: 'playwright_fallback', durationMs, cacheHit: false,
                    }, 'EmailDiscovery: Completed (Playwright fallback)');
                    (0, socket_manager_1.emitEmailDiscoveryUpdate)(leadId, { status: 'completed', primaryEmail, emailCount: allEmails.length });
                    return { discoveredEmails: allEmails, primaryEmail, emailCount: allEmails.length, success: true, method: 'playwright_fallback', durationMs };
                }
            }
            await this.updateLeadWithEmails(leadId, [], '', 'completed');
            const durationMs = Date.now() - startTime;
            logger_1.logger.info({
                leadId, website: baseUrl, emailsFound: 0, method: 'all_failed', durationMs, cacheHit: false,
            }, 'EmailDiscovery: Completed (no emails found)');
            (0, socket_manager_1.emitEmailDiscoveryUpdate)(leadId, { status: 'completed', primaryEmail: '', emailCount: 0 });
            return { discoveredEmails: [], primaryEmail: '', emailCount: 0, success: true, method: 'all_failed', durationMs };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await Lead_1.Lead.findByIdAndUpdate(leadId, {
                $set: {
                    emailDiscoveryStatus: 'failed',
                    emailDiscoveryError: message,
                    lastEmailScan: new Date(),
                },
                $inc: { emailDiscoveryRetries: 1 },
            });
            const durationMs = Date.now() - startTime;
            logger_1.logger.error({ leadId, website: baseUrl, err: message, durationMs }, 'EmailDiscovery: Failed');
            (0, socket_manager_1.emitEmailDiscoveryUpdate)(leadId, { status: 'failed', error: message });
            return { discoveredEmails: [], primaryEmail: '', emailCount: 0, success: false, error: message, durationMs };
        }
    }
    async discoverEmailsForLeadAsync(leadId) {
        email_discovery_queue_service_1.emailDiscoveryQueue.enqueue(leadId, async () => {
            await this.discoverEmailsForLead(leadId);
        });
    }
    async backfillAllLeads(concurrency = 5) {
        const cursor = Lead_1.Lead.find({
            hasWebsite: true,
            website: { $exists: true, $nin: ['', null] },
            $or: [
                { emailDiscoveryStatus: { $in: ['pending', 'failed', null] } },
                { emailDiscoveryStatus: { $exists: false } },
                { lastEmailScan: null },
            ],
        }).cursor();
        let processed = 0;
        let succeeded = 0;
        let failed = 0;
        let skipped = 0;
        const active = [];
        for await (const lead of cursor) {
            if (active.length >= concurrency) {
                await Promise.race(active);
            }
            const promise = (async () => {
                try {
                    const result = await this.discoverEmailsForLead(lead._id.toString());
                    if (result.success) {
                        succeeded++;
                    }
                    else {
                        if (result.error?.includes('no website') || result.error?.includes('Social/directory')) {
                            skipped++;
                        }
                        else {
                            failed++;
                        }
                    }
                }
                catch {
                    failed++;
                }
                processed++;
            })();
            active.push(promise);
            promise.finally(() => {
                const idx = active.indexOf(promise);
                if (idx > -1)
                    active.splice(idx, 1);
            });
        }
        await Promise.all(active);
        logger_1.logger.info({ processed, succeeded, failed, skipped }, 'EmailDiscovery: Backfill completed');
        return { processed, succeeded, failed, skipped };
    }
}
exports.BusinessEmailDiscoveryService = BusinessEmailDiscoveryService;
exports.businessEmailDiscoveryService = new BusinessEmailDiscoveryService();
//# sourceMappingURL=business-email-discovery.service.js.map