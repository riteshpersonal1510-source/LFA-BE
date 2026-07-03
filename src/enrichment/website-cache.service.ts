interface CachedAnalysis {
  domain: string;
  data: WebsiteCacheData;
  timestamp: number;
  ttl: number;
}

export interface WebsiteCacheData {
  emails: string[];
  phones: string[];
  socialLinks: Record<string, string>;
  companyName?: string;
  copyright?: string;
  hasContactForm: boolean;
  hasContactPage: boolean;
  pagesCrawled: string[];
  extractedAt: string;
}

export class WebsiteCache {
  private cache = new Map<string, CachedAnalysis>();
  private maxEntries = 5000;
  private defaultTtl = 24 * 60 * 60 * 1000;

  get(domain: string): WebsiteCacheData | null {
    const normalized = this.normalizeDomain(domain);
    const entry = this.cache.get(normalized);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(normalized);
      return null;
    }
    return entry.data;
  }

  set(domain: string, data: WebsiteCacheData, ttl?: number): void {
    const normalized = this.normalizeDomain(domain);
    if (this.cache.size >= this.maxEntries) {
      const oldest = this.cache.entries().next().value;
      if (oldest) this.cache.delete(oldest[0]);
    }
    this.cache.set(normalized, {
      domain: normalized,
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTtl,
    });
  }

  has(domain: string): boolean {
    return this.get(domain) !== null;
  }

  invalidate(domain: string): void {
    const normalized = this.normalizeDomain(domain);
    this.cache.delete(normalized);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  get stats(): { size: number; maxEntries: number; defaultTtl: number } {
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      defaultTtl: this.defaultTtl,
    };
  }

  private normalizeDomain(url: string): string {
    let domain = url.toLowerCase().trim();
    domain = domain.replace(/^https?:\/\//, '');
    domain = domain.replace(/\/.*$/, '');
    domain = domain.replace(/^www\./, '');
    return domain;
  }
}

export const websiteCache = new WebsiteCache();
