"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.websiteIntelligenceEngine = exports.WebsiteIntelligenceEngine = void 0;
const Lead_1 = require("../models/Lead");
const logger_1 = require("../utils/logger");
const browser_manager_1 = require("../core/scraper-engine/browser-manager");
const phone_extraction_service_1 = require("./phone-extraction.service");
const website_metadata_service_1 = require("./website-metadata.service");
const contact_discovery_service_1 = require("./contact-discovery.service");
const business_email_discovery_service_1 = require("./business-email-discovery.service");
const responsive_audit_service_1 = require("./responsive-audit.service");
const ai_analysis_engine_service_1 = require("./ai-analysis-engine.service");
const MAX_CONCURRENT = 3;
const REQUEST_TIMEOUT = 15000;
const MAX_PAGES_PER_SITE = 7;
const CRAWL_PATHS = ['/', '/contact', '/contact-us', '/about', '/about-us', '/services', '/support', '/faq', '/privacy-policy', '/terms'];
const CONTACT_KEYWORDS = ['contact', 'support', 'help', 'enquiry', 'get-in-touch', 'reach-us', 'connect', 'location', 'branch'];
const ABOUT_KEYWORDS = ['about', 'about-us', 'aboutus', 'who-we-are', 'team', 'our-team'];
const SERVICES_KEYWORDS = ['services', 'service', 'what-we-do', 'solutions', 'products', 'offerings'];
class WebsiteIntelligenceEngine {
    constructor() {
        this.queue = [];
        this.processing = new Set();
        this.running = false;
    }
    enqueueForProcessing(leadId, website) {
        if (this.processing.has(leadId))
            return;
        const alreadyQueued = this.queue.some(e => e.leadId === leadId);
        if (alreadyQueued)
            return;
        this.queue.push({ leadId, website: website || '' });
        logger_1.logger.debug({ leadId }, 'WebsiteIntelligence: Queued for processing');
        if (!this.running)
            this.processQueue();
    }
    async processQueue() {
        this.running = true;
        while (this.queue.length > 0 && this.processing.size < MAX_CONCURRENT) {
            const entry = this.queue.shift();
            if (!entry)
                break;
            if (this.processing.has(entry.leadId))
                continue;
            this.processing.add(entry.leadId);
            this.processLead(entry.leadId, entry.website).finally(() => {
                this.processing.delete(entry.leadId);
                if (this.queue.length > 0)
                    setImmediate(() => this.processQueue());
                else
                    this.running = false;
            });
        }
    }
    async processLead(leadId, website) {
        const startTime = Date.now();
        logger_1.logger.info({ leadId, website }, 'WebsiteIntelligence: Starting');
        try {
            const lead = await Lead_1.Lead.findById(leadId).select('hasWebsite website companyName');
            if (!lead) {
                logger_1.logger.warn({ leadId }, 'WebsiteIntelligence: Lead not found');
                return;
            }
            if (!lead.hasWebsite || !lead.website) {
                await Lead_1.Lead.findByIdAndUpdate(leadId, {
                    $set: { websiteReachable: false, websiteIntelligenceCompletedAt: new Date() },
                });
                logger_1.logger.info({ leadId }, 'WebsiteIntelligence: No website, skipped');
                return;
            }
            const baseUrl = this.normalizeUrl(lead.website);
            await Lead_1.Lead.findByIdAndUpdate(leadId, { $set: { websiteReachable: true } });
            const crawledPages = await this.crawlWebsite(baseUrl);
            if (crawledPages.length === 0) {
                logger_1.logger.warn({ leadId, website: baseUrl }, 'WebsiteIntelligence: Crawl returned no pages');
                await Lead_1.Lead.findByIdAndUpdate(leadId, {
                    $set: {
                        websiteReachable: false,
                        websiteIntelligenceCompletedAt: new Date(),
                    },
                });
                return;
            }
            logger_1.logger.info({ leadId, pagesCount: crawledPages.length, urls: crawledPages.map(p => p.url) }, 'WebsiteIntelligence: Pages crawled');
            const contactResult = contact_discovery_service_1.contactDiscoveryService.discoverFromPages(crawledPages.map(p => ({ url: p.url, html: p.html, text: p.text, links: p.links })));
            const phoneResult = phone_extraction_service_1.phoneExtractionService.extractFromCrawledPages(crawledPages.map(p => ({ url: p.url, content: p.text, html: p.html, links: p.links })));
            const metadata = website_metadata_service_1.websiteMetadataService.extractFromPages(crawledPages.map(p => ({ url: p.url, html: p.html, links: p.links })));
            const emailUpdate = {};
            if (contactResult.contactPageUrl) {
                emailUpdate.contactPages = [contactResult.contactPageUrl];
            }
            if (contactResult.hasContactForm) {
                emailUpdate.contactForm = true;
            }
            if (phoneResult.whatsappNumber) {
                emailUpdate.whatsappNumber = phoneResult.whatsappNumber;
            }
            const existingPhones = [];
            if (phoneResult.phones.length > 0) {
                const allPhones = [...new Set([...existingPhones, ...phoneResult.phones])];
                emailUpdate.phones = allPhones;
                if (phoneResult.primaryPhone) {
                    emailUpdate.phone = phoneResult.primaryPhone;
                }
            }
            const hasSocialLinks = Object.values(contactResult.socialLinks).some(v => v && (typeof v === 'string' ? v.length > 0 : v.length > 0));
            if (hasSocialLinks) {
                emailUpdate.socialLinks = contactResult.socialLinks;
            }
            emailUpdate.websiteMetadata = metadata;
            const quality = this.assessQuality(crawledPages, contactResult, phoneResult, metadata.httpsEnabled);
            emailUpdate.websiteQuality = quality;
            const issueCount = quality.issues.length;
            if (issueCount === 0)
                emailUpdate.websiteStatus = 'modern-website';
            else if (issueCount <= 2)
                emailUpdate.websiteStatus = 'average-website';
            else if (issueCount <= 4)
                emailUpdate.websiteStatus = 'outdated-website';
            else
                emailUpdate.websiteStatus = 'broken-website';
            emailUpdate.websiteIntelligenceCompletedAt = new Date();
            await Lead_1.Lead.findByIdAndUpdate(leadId, { $set: emailUpdate });
            logger_1.logger.info({
                leadId,
                website: baseUrl,
                pagesCrawled: crawledPages.length,
                emailsFound: 0,
                phonesFound: phoneResult.phones.length,
                socialLinksFound: Object.values(contactResult.socialLinks).filter(Boolean).length,
                hasContactForm: contactResult.hasContactForm,
                cms: metadata.cms,
                qualityScore: quality.score,
                issues: quality.issues,
                durationMs: Date.now() - startTime,
            }, 'WebsiteIntelligence: Completed');
            setImmediate(async () => {
                try {
                    await business_email_discovery_service_1.businessEmailDiscoveryService.discoverEmailsForLead(leadId);
                }
                catch { }
            });
            setImmediate(async () => {
                try {
                    await responsive_audit_service_1.responsiveAuditService.auditLead(leadId);
                }
                catch { }
            });
            setImmediate(() => {
                ai_analysis_engine_service_1.aiAnalysisEngine.enqueueAnalysis(leadId);
            });
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            logger_1.logger.error({ leadId, website, err: errMsg }, 'WebsiteIntelligence: Failed');
            try {
                await Lead_1.Lead.findByIdAndUpdate(leadId, {
                    $set: {
                        websiteReachable: false,
                        websiteIntelligenceCompletedAt: new Date(),
                    },
                });
            }
            catch { }
        }
    }
    async crawlWebsite(baseUrl) {
        let page = null;
        try {
            const acquired = await browser_manager_1.browserManager.acquire('website-intel');
            page = acquired.page;
            const pages = [];
            const visited = new Set();
            const toVisit = CRAWL_PATHS.map(p => this.joinUrl(baseUrl, p));
            while (toVisit.length > 0 && pages.length < MAX_PAGES_PER_SITE) {
                const url = toVisit.shift();
                if (visited.has(url))
                    continue;
                visited.add(url);
                try {
                    const response = await page.goto(url, {
                        waitUntil: 'networkidle',
                        timeout: REQUEST_TIMEOUT,
                    });
                    const statusCode = response?.status() || 0;
                    const data = await page.evaluate(() => {
                        const html = document.documentElement.outerHTML;
                        const text = document.body?.innerText || '';
                        const title = document.title || '';
                        const links = [];
                        document.querySelectorAll('a[href]').forEach(el => {
                            const href = el.href || '';
                            if (href && !href.startsWith('javascript:'))
                                links.push(href);
                        });
                        return { html, text, title, links };
                    });
                    const crawlPage = {
                        url: page.url(),
                        html: data.html,
                        text: data.text,
                        title: data.title,
                        links: data.links,
                        statusCode,
                    };
                    pages.push(crawlPage);
                    const footerLinks = await this.extractFooterLinks(page);
                    for (const link of footerLinks) {
                        const absUrl = this.joinUrl(baseUrl, link);
                        if (!visited.has(absUrl) && this.isSameDomain(absUrl, baseUrl)) {
                            const pathname = new URL(absUrl).pathname.toLowerCase();
                            const relevant = CONTACT_KEYWORDS.some(k => pathname.includes(k))
                                || ABOUT_KEYWORDS.some(k => pathname.includes(k))
                                || SERVICES_KEYWORDS.some(k => pathname.includes(k));
                            if (relevant && !toVisit.includes(absUrl)) {
                                toVisit.push(absUrl);
                            }
                        }
                    }
                }
                catch {
                    const crawlPage = {
                        url, html: '', text: '', title: '', links: [], statusCode: 0,
                    };
                    pages.push(crawlPage);
                }
            }
            return pages;
        }
        catch (error) {
            logger_1.logger.error({ baseUrl, err: error instanceof Error ? error.message : String(error) }, 'WebsiteIntelligence: Crawl failed');
            return [];
        }
        finally {
            if (page) {
                await browser_manager_1.browserManager.release(page, 'website-intel').catch(() => { });
            }
        }
    }
    async extractFooterLinks(page) {
        try {
            return await page.evaluate(() => {
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
        }
        catch {
            return [];
        }
    }
    assessQuality(pages, contactResult, phoneResult, httpsEnabled) {
        const issues = [];
        let score = 50;
        let contactPageStatus = 'missing';
        if (httpsEnabled) {
            score += 15;
        }
        else {
            issues.push('HTTPS not enabled');
        }
        if (contactResult.contactPageUrl) {
            const contactPage = pages.find(p => p.url === contactResult.contactPageUrl || p.url.includes('/contact'));
            if (contactPage && contactPage.statusCode === 404) {
                issues.push('Contact page returns 404');
                contactPageStatus = 'broken';
            }
            else {
                score += 10;
                contactPageStatus = 'found';
            }
        }
        else {
            issues.push('No contact page found');
        }
        const hasAbout = pages.some(p => {
            try {
                return ABOUT_KEYWORDS.some(k => new URL(p.url).pathname.includes(k));
            }
            catch {
                return false;
            }
        });
        if (hasAbout) {
            score += 5;
        }
        else {
            issues.push('No about page');
        }
        const hasServices = pages.some(p => {
            try {
                return SERVICES_KEYWORDS.some(k => new URL(p.url).pathname.includes(k));
            }
            catch {
                return false;
            }
        });
        if (hasServices)
            score += 5;
        else
            issues.push('No services page');
        if (contactResult.hasContactForm) {
            score += 10;
        }
        else {
            issues.push('No contact form');
        }
        if (phoneResult.phones.length > 0) {
            score += 5;
        }
        else {
            issues.push('No phone number found');
        }
        const hasBrokenNav = pages.some(p => p.statusCode === 404 || p.statusCode === 500);
        if (hasBrokenNav) {
            issues.push('Broken navigation detected');
            score -= 10;
        }
        score = Math.max(0, Math.min(100, score));
        return {
            sslEnabled: httpsEnabled,
            brokenNavigation: hasBrokenNav,
            contactPageStatus,
            aboutPageStatus: hasAbout ? 'found' : 'missing',
            servicesPageStatus: hasServices ? 'found' : 'missing',
            hasContactForm: contactResult.hasContactForm,
            hasEmail: false,
            hasPhone: phoneResult.phones.length > 0,
            issues,
            score,
        };
    }
    normalizeUrl(url) {
        let normalized = url.trim();
        if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
            normalized = `https://${normalized}`;
        }
        normalized = normalized.replace(/\/+$/, '');
        return normalized;
    }
    joinUrl(base, path) {
        const baseClean = base.replace(/\/+$/, '');
        const pathClean = path.startsWith('/') ? path : `/${path}`;
        return `${baseClean}${pathClean}`;
    }
    isSameDomain(url, baseUrl) {
        try {
            const urlHost = new URL(url).hostname.replace(/^www\./, '');
            const baseHost = new URL(baseUrl).hostname.replace(/^www\./, '');
            return urlHost === baseHost;
        }
        catch {
            return false;
        }
    }
}
exports.WebsiteIntelligenceEngine = WebsiteIntelligenceEngine;
exports.websiteIntelligenceEngine = new WebsiteIntelligenceEngine();
//# sourceMappingURL=website-intelligence-engine.service.js.map