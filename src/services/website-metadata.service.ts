export interface WebsiteMetadata {
  title: string;
  description: string;
  favicon: string;
  logo: string;
  language: string;
  httpsEnabled: boolean;
  canonicalUrl: string;
  cms: string;
}

export interface CrawledPageForMetadata {
  url: string;
  html: string;
  links: string[];
}

const CMS_PATTERNS: Array<{ name: string; patterns: RegExp[] }> = [
  { name: 'WordPress', patterns: [/\/wp-content\//i, /\/wp-includes\//i, /wp-json/i, /<meta name="generator"[^>]+WordPress/i] },
  { name: 'Shopify', patterns: [/shopify\.com/i, /Shopify/i, /\/cdn\.shopify\.com\//i, /powered_by_shopify/i] },
  { name: 'Wix', patterns: [/wix\.com/i, /Wix\.com/i, /wixstatic\.com/i, /<meta name="generator"[^>]+Wix/i] },
  { name: 'Webflow', patterns: [/webflow\.com/i, /<meta name="generator"[^>]+Webflow/i] },
  { name: 'Squarespace', patterns: [/squarespace\.com/i, /squarespace/i, /static1\.squarespace/i] },
  { name: 'Joomla', patterns: [/\/components\/com_/i, /\/modules\/mod_/i, /<meta name="generator"[^>]+Joomla/i] },
  { name: 'Drupal', patterns: [/drupal\.org/i, /Drupal/i, /\/sites\/default\//i, /<meta name="generator"[^>]+Drupal/i] },
  { name: 'PrestaShop', patterns: [/prestashop\.com/i, /PrestaShop/i] },
  { name: 'Magento', patterns: [/magento/i, /mage\/copyright/i] },
  { name: 'Weebly', patterns: [/weebly\.com/i, /wix\.com/i] },
  { name: 'BigCommerce', patterns: [/bigcommerce\.com/i, /cdn\.bigcommerce/i] },
  { name: 'WooCommerce', patterns: [/\/wp-content\/.*woocommerce/i, /woocommerce/i] },
];

export class WebsiteMetadataService {
  extractFromPages(pages: CrawledPageForMetadata[]): WebsiteMetadata {
    const homepage = pages.find(p => {
      const path = new URL(p.url).pathname;
      return path === '/' || path === '';
    }) || pages[0];

    const allHtml = pages.map(p => p.html).join(' ');
    const allUrls = pages.map(p => p.url);

    const title = this.extractTitle(pages);
    const description = this.extractMetaDescription(allHtml);
    const favicon = this.extractFavicon(allHtml, homepage?.url || allUrls[0] || '');
    const logo = this.extractLogo(allHtml, allUrls[0] || '');
    const language = this.extractLanguage(allHtml);
    const httpsEnabled = allUrls.some(u => u.startsWith('https://'));
    const canonicalUrl = this.extractCanonical(allHtml);
    const cms = this.detectCms(allHtml);

    return { title, description, favicon, logo, language, httpsEnabled, canonicalUrl, cms };
  }

  private extractTitle(pages: CrawledPageForMetadata[]): string {
    for (const page of pages) {
      const m = page.html.match(/<title>([^<]*)<\/title>/i);
      if (m && m[1].trim()) return m[1].trim();
    }
    return '';
  }

  private extractMetaDescription(html: string): string {
    const m = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
    if (m && m[1].trim()) return m[1].trim();
    const m2 = html.match(/<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i);
    if (m2 && m2[1].trim()) return m2[1].trim();
    return '';
  }

  private extractFavicon(html: string, baseUrl: string): string {
    const m = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i);
    if (m) return this.resolveUrl(m[1], baseUrl);
    const m2 = html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i);
    if (m2) return this.resolveUrl(m2[1], baseUrl);
    return `${baseUrl.replace(/\/+$/, '')}/favicon.ico`;
  }

  private extractLogo(html: string, baseUrl: string): string {
    const patterns = [
      /<img[^>]*id=["']logo["'][^>]*src=["']([^"']+)["']/i,
      /<img[^>]*class=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+)["']/i,
      /<img[^>]*alt=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+)["']/i,
      /<img[^>]*src=["']([^"']+)["'][^>]*class=["'][^"']*logo[^"']*["']/i,
      /<img[^>]*src=["']([^"']+)["'][^>]*alt=["'][^"']*logo[^"']*["']/i,
    ];
    for (const pattern of patterns) {
      const m = html.match(pattern);
      if (m) return this.resolveUrl(m[1], baseUrl);
    }
    return '';
  }

  private extractLanguage(html: string): string {
    const m = html.match(/<html[^>]*lang=["']([a-zA-Z-]+)["']/i);
    if (m) return m[1];
    return '';
  }

  private extractCanonical(html: string): string {
    const m = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
    if (m) return m[1];
    const m2 = html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
    if (m2) return m2[1];
    return '';
  }

  private detectCms(html: string): string {
    for (const cms of CMS_PATTERNS) {
      for (const pattern of cms.patterns) {
        if (pattern.test(html)) return cms.name;
      }
    }
    return '';
  }

  private resolveUrl(url: string, baseUrl: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = baseUrl.replace(/\/+$/, '');
    if (url.startsWith('/')) return `${base}${url}`;
    return `${base}/${url}`;
  }
}

export const websiteMetadataService = new WebsiteMetadataService();
