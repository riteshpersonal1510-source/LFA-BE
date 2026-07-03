import { logger } from '../utils/logger';
import { browserManager } from '../core/scraper-engine/browser-manager';
import { websiteCache } from './website-cache.service';
import type { WebsiteCacheData } from './website-cache.service';

const ENRICHMENT_PATHS = [
  '/',
  '/about',
  '/about-us',
  '/contact',
  '/contact-us',
  '/team',
];

const SOCIAL_PATTERNS: Record<string, RegExp> = {
  facebook: /facebook\.com\/([^\/\?#]+)/i,
  instagram: /instagram\.com\/([^\/\?#]+)/i,
  linkedin: /linkedin\.com\/(company|in)\/([^\/\?#]+)/i,
  youtube: /(youtube\.com|youtu\.be)\//i,
  twitter: /(twitter\.com|x\.com)\/([^\/\?#]+)/i,
  whatsapp: /(wa\.me|whatsapp\.com)\/([^\/\?#]+)/i,
};

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export interface WebsiteEnrichmentResult {
  emails: string[];
  phones: string[];
  socialLinks: Record<string, string>;
  companyName?: string;
  copyright?: string;
  hasContactForm: boolean;
  hasContactPage: boolean;
  pagesCrawled: string[];
  success: boolean;
  error?: string;
}

export class WebsiteEnrichmentService {
  private readonly REQUEST_TIMEOUT = 15000;
  private readonly MAX_PAGES = 7;

  async enrichWebsite(domain: string): Promise<WebsiteEnrichmentResult> {
    const cached = websiteCache.get(domain);
    if (cached) {
      logger.debug({ domain }, 'WebsiteEnrichment: Using cached result');
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
      const cacheData: WebsiteCacheData = {
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
      websiteCache.set(domain, cacheData);
    }

    return result;
  }

  private async crawlAndExtract(domain: string): Promise<WebsiteEnrichmentResult> {
    const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
    let page: any = null;

    const result: WebsiteEnrichmentResult = {
      emails: [],
      phones: [],
      socialLinks: {},
      pagesCrawled: [],
      hasContactForm: false,
      hasContactPage: false,
      success: false,
    };

    try {
      const acquired = await browserManager.acquire('website-enrich');
      page = acquired.page;

      const visited = new Set<string>();
      const toVisit = ENRICHMENT_PATHS.map(p => this.joinUrl(baseUrl, p));

      while (toVisit.length > 0 && result.pagesCrawled.length < this.MAX_PAGES) {
        const url = toVisit.shift()!;
        if (visited.has(url)) continue;
        visited.add(url);

        try {
          await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: this.REQUEST_TIMEOUT,
          });

          const pageText = await page.evaluate(() => document.body?.innerText || '');
          const pageHtml = await page.evaluate(() => document.documentElement?.outerHTML || '');
          const pageLinks = await page.evaluate(() => {
            const links: string[] = [];
            document.querySelectorAll('a[href]').forEach(el => {
              const href = (el as HTMLAnchorElement).href || '';
              if (href && !href.startsWith('javascript:')) links.push(href);
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
            const links: string[] = [];
            const footer = document.querySelector('footer') || document.querySelector('[class*="footer"]') || document.querySelector('[id*="footer"]');
            if (footer) {
              footer.querySelectorAll('a[href]').forEach(el => {
                const href = (el as HTMLAnchorElement).href || el.getAttribute('href') || '';
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
        } catch {
          continue;
        }
      }

      result.emails = [...new Set(result.emails)];
      result.phones = [...new Set(result.phones)];

      // deduplicate
      for (const [platform, url] of Object.entries(result.socialLinks)) {
        if (!url) delete result.socialLinks[platform];
      }

      result.success = result.pagesCrawled.length > 0;
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err);
      logger.error({ domain, err: result.error }, 'WebsiteEnrichment: Failed');
    } finally {
      if (page) {
        await browserManager.release(page, 'website-enrich').catch(() => {});
      }
    }

    return result;
  }

  private extractEmails(_text: string, html: string, result: WebsiteEnrichmentResult): void {
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

  private extractPhones(text: string, html: string, result: WebsiteEnrichmentResult): void {
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

  private extractSocialLinks(links: string[], result: WebsiteEnrichmentResult): void {
    for (const link of links) {
      for (const [platform, pattern] of Object.entries(SOCIAL_PATTERNS)) {
        if (pattern.test(link) && !result.socialLinks[platform]) {
          result.socialLinks[platform] = link;
        }
      }
    }
  }

  private extractCompanyName(_text: string, html: string, result: WebsiteEnrichmentResult): void {
    if (result.companyName) return;
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

  private extractCopyright(text: string, result: WebsiteEnrichmentResult): void {
    const match = text.match(/(?:copyright|©)\s*(?:20\d{2})\s*(?:by\s*)?([^\n]{2,60})/i);
    if (match) {
      result.copyright = match[0].trim();
    }
  }

  private detectContactForm(html: string): boolean {
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
      if (html.includes(indicator)) return true;
    }
    return false;
  }

  private isContactPage(url: string): boolean {
    const path = url.toLowerCase();
    return path.includes('/contact') || path.includes('/support') || path.includes('/enquiry');
  }

  private isRelevantPage(url: string): boolean {
    const path = url.toLowerCase();
    return path.includes('/contact') || path.includes('/about') || path.includes('/team') || path.includes('/service') || path.includes('/support');
  }

  private isSameDomain(url: string, baseUrl: string): boolean {
    try {
      const u = new URL(url);
      const b = new URL(baseUrl);
      return u.hostname === b.hostname;
    } catch {
      return false;
    }
  }

  private joinUrl(base: string, path: string): string {
    try {
      const baseUrl = new URL(base);
      return new URL(path, baseUrl.origin).href;
    } catch {
      return base + path;
    }
  }

  private toAbsoluteUrl(base: string, href: string): string | null {
    try {
      if (href.startsWith('http')) return href;
      if (href.startsWith('/')) {
        const baseUrl = new URL(base);
        return `${baseUrl.origin}${href}`;
      }
      return null;
    } catch {
      return null;
    }
  }
}
