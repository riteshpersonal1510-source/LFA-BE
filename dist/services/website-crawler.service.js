"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.websiteCrawlerService = exports.WebsiteCrawlerService = void 0;
const logger_1 = require("../utils/logger");
const browser_manager_1 = require("../scrapers/browser-manager");
class WebsiteCrawlerService {
    constructor() {
        this.browserManager = null;
        this.browserManager = null;
    }
    async crawlWebsite(baseUrl, options = {}) {
        const startTime = Date.now();
        const crawledPages = [];
        const visitedUrls = new Set();
        const pagesToCrawl = [baseUrl];
        let currentPage = 0;
        const maxPages = options.maxPages || 10;
        const timeout = options.timeout || 15000;
        try {
            this.browserManager = new browser_manager_1.PlaywrightBrowser();
            while (pagesToCrawl.length > 0 && currentPage < maxPages) {
                const url = pagesToCrawl.shift();
                if (visitedUrls.has(url) || !this.isSameDomain(url, baseUrl)) {
                    continue;
                }
                visitedUrls.add(url);
                currentPage++;
                logger_1.logger.info(`Crawling page ${currentPage}: ${url}`);
                try {
                    const result = await this.crawlSinglePage(url, timeout);
                    crawledPages.push(result);
                    if (result.links.length > 0 && visitedUrls.size < maxPages) {
                        for (const link of result.links) {
                            if (!visitedUrls.has(link) && this.isSameDomain(link, baseUrl)) {
                                pagesToCrawl.push(link);
                            }
                        }
                    }
                }
                catch (error) {
                    logger_1.logger.warn(`Failed to crawl ${url}:`, error.message);
                }
            }
            return {
                crawledPages,
                totalPages: crawledPages.length,
                crawlTime: Date.now() - startTime,
                status: crawledPages.length > 0 ? 'success' : 'failed',
            };
        }
        catch (error) {
            logger_1.logger.error('Website crawl failed:', error);
            return {
                crawledPages,
                totalPages: crawledPages.length,
                crawlTime: Date.now() - startTime,
                status: 'failed',
            };
        }
        finally {
            if (this.browserManager) {
                await this.browserManager.close();
                this.browserManager = null;
            }
        }
    }
    async crawlSinglePage(url, timeout) {
        const result = {
            url,
            title: '',
            content: '',
            links: [],
            images: [],
            metadata: {},
            extractionTime: 0,
        };
        const startTime = Date.now();
        try {
            if (!this.browserManager) {
                this.browserManager = new browser_manager_1.PlaywrightBrowser();
            }
            const { page } = await this.browserManager.initialize();
            page.setDefaultTimeout(timeout);
            await page.goto(url, { waitUntil: 'networkidle', timeout });
            await page.waitForTimeout(1000);
            const pageData = await page.evaluate(() => {
                const title = document.title || '';
                const content = document.body.innerText || '';
                const links = [];
                const images = [];
                document.querySelectorAll('a').forEach(el => {
                    const href = el.getAttribute('href');
                    if (href) {
                        links.push(href);
                    }
                });
                document.querySelectorAll('img').forEach(el => {
                    const src = el.getAttribute('src');
                    if (src) {
                        images.push(src);
                    }
                });
                const metaTitle = document.querySelector('meta[name="title"]')?.getAttribute('content') || '';
                const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
                const h1 = document.querySelector('h1')?.innerText || '';
                const h2 = [];
                document.querySelectorAll('h2').forEach(el => {
                    h2.push(el.innerText);
                });
                return {
                    title,
                    content,
                    links,
                    images,
                    metadata: {
                        metaTitle,
                        metaDescription,
                        h1,
                        h2,
                    },
                };
            });
            result.title = pageData.title;
            result.content = pageData.content;
            result.links = pageData.links;
            result.images = pageData.images;
            result.metadata = pageData.metadata;
            result.extractionTime = Date.now() - startTime;
            await this.browserManager.close();
        }
        catch (error) {
            logger_1.logger.warn(`Failed to crawl page ${url}:`, error.message);
        }
        return result;
    }
    isSameDomain(url, baseUrl) {
        try {
            const urlObj = new URL(url);
            const baseObj = new URL(baseUrl);
            return urlObj.hostname === baseObj.hostname;
        }
        catch {
            return false;
        }
    }
    async crawlAndExtractContacts(baseUrl, options = {}) {
        const { crawledPages } = await this.crawlWebsite(baseUrl, options);
        const emails = [];
        const phones = [];
        const socialLinks = {};
        for (const page of crawledPages) {
            const emailMatches = page.content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
            if (emailMatches) {
                emails.push(...emailMatches);
            }
            const phoneMatches = page.content.match(/\+?[\d\s\-\(\)]{10,}/g);
            if (phoneMatches) {
                phones.push(...phoneMatches);
            }
            for (const link of page.links) {
                const lowerLink = link.toLowerCase();
                if (lowerLink.includes('facebook.com') && !socialLinks.facebook) {
                    socialLinks.facebook = link;
                }
                if (lowerLink.includes('instagram.com') && !socialLinks.instagram) {
                    socialLinks.instagram = link;
                }
                if (lowerLink.includes('linkedin.com') && !socialLinks.linkedin) {
                    socialLinks.linkedin = link;
                }
                if (lowerLink.includes('twitter.com') || lowerLink.includes('x.com')) {
                    if (!socialLinks.twitter)
                        socialLinks.twitter = link;
                }
            }
        }
        return {
            emails: [...new Set(emails)],
            phones: [...new Set(phones)],
            socialLinks,
            crawledPages,
        };
    }
}
exports.WebsiteCrawlerService = WebsiteCrawlerService;
exports.websiteCrawlerService = new WebsiteCrawlerService();
//# sourceMappingURL=website-crawler.service.js.map