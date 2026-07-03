"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seoAuditService = exports.SeoAuditService = void 0;
class SeoAuditService {
    auditFromHtml(html) {
        const issues = [];
        const title = this.extract(html, /<title>([^<]*)<\/title>/i);
        const titleLength = title.length;
        const titleOk = titleLength >= 30 && titleLength <= 60;
        if (!title)
            issues.push('Missing page title');
        else if (!titleOk)
            issues.push(`Title length ${titleLength} chars (recommended 30-60)`);
        const metaDescription = this.extractMetaDescription(html);
        const metaDescriptionLength = metaDescription.length;
        const metaDescriptionOk = metaDescriptionLength >= 120 && metaDescriptionLength <= 160;
        if (!metaDescription)
            issues.push('Missing meta description');
        else if (!metaDescriptionOk)
            issues.push(`Meta description length ${metaDescriptionLength} chars (recommended 120-160)`);
        const h1Tags = this.extractAll(html, /<h1[^>]*>([^<]*)<\/h1>/gi);
        const h1Count = h1Tags.length;
        const h1Present = h1Count > 0;
        const h1Text = h1Tags[0] || '';
        if (!h1Present)
            issues.push('Missing H1 heading');
        else if (h1Count > 1)
            issues.push(`Multiple H1 tags (${h1Count})`);
        const robotsMeta = this.extractMetaRobots(html);
        if (robotsMeta.includes('noindex'))
            issues.push('Page blocked from indexing (noindex)');
        if (robotsMeta.includes('nofollow'))
            issues.push('Links blocked from crawling (nofollow)');
        const canonicalUrl = this.extractCanonical(html);
        const canonicalPresent = !!canonicalUrl;
        const ogTitle = this.extractMetaProperty(html, 'og:title');
        const ogDescription = this.extractMetaProperty(html, 'og:description');
        const ogImage = this.extractMetaProperty(html, 'og:image');
        const ogPresent = !!(ogTitle || ogDescription || ogImage);
        if (!ogPresent)
            issues.push('Missing Open Graph tags');
        const twitterCard = this.extractMetaName(html, 'twitter:card');
        const twitterPresent = !!twitterCard;
        if (!twitterPresent)
            issues.push('Missing Twitter Card tags');
        const jsonLdScripts = this.extractJsonLd(html);
        const jsonLdPresent = jsonLdScripts.length > 0;
        const jsonLdTypes = jsonLdScripts.map(s => String(s['@type'] || '')).filter(Boolean);
        const schemaOrgTypes = this.extractSchemaOrgTypes(html);
        const hasSchemaOrg = schemaOrgTypes.length > 0;
        const faviconPresent = this.hasFavicon(html);
        let score = 50;
        if (titleOk)
            score += 10;
        if (metaDescriptionOk)
            score += 10;
        if (h1Present && h1Count === 1)
            score += 10;
        if (!robotsMeta.includes('noindex'))
            score += 5;
        if (canonicalPresent)
            score += 5;
        if (ogPresent)
            score += 5;
        if (twitterPresent)
            score += 5;
        if (jsonLdPresent)
            score += 5;
        if (faviconPresent)
            score += 5;
        score = Math.max(0, Math.min(100, score));
        return {
            title, titleLength, titleOk,
            metaDescription, metaDescriptionLength, metaDescriptionOk,
            h1Count, h1Present, h1Text,
            robotsMeta, canonicalUrl, canonicalPresent,
            ogTitle, ogDescription, ogImage, ogPresent,
            twitterCard, twitterPresent,
            jsonLdPresent, jsonLdTypes,
            hasSchemaOrg, schemaOrgTypes,
            faviconPresent,
            score, issues,
        };
    }
    extract(html, pattern) {
        const m = html.match(pattern);
        return m ? m[1].trim() : '';
    }
    extractAll(html, pattern) {
        const results = [];
        let m;
        while ((m = pattern.exec(html)) !== null) {
            results.push(m[1].trim());
        }
        return results;
    }
    extractMetaDescription(html) {
        const m = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
        if (m)
            return m[1].trim();
        const m2 = html.match(/<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i);
        return m2 ? m2[1].trim() : '';
    }
    extractMetaRobots(html) {
        const m = html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']*)["']/i);
        if (m)
            return m[1].toLowerCase();
        const m2 = html.match(/<meta\s+content=["']([^"']*)["']\s+name=["']robots["']/i);
        return m2 ? m2[1].toLowerCase() : '';
    }
    extractCanonical(html) {
        const m = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
        if (m)
            return m[1];
        const m2 = html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
        return m2 ? m2[1] : '';
    }
    extractMetaProperty(html, property) {
        const pattern = new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i');
        const m = html.match(pattern);
        if (m)
            return m[1].trim();
        const pattern2 = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, 'i');
        const m2 = html.match(pattern2);
        return m2 ? m2[1].trim() : '';
    }
    extractMetaName(html, name) {
        const pattern = new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i');
        const m = html.match(pattern);
        if (m)
            return m[1].trim();
        const pattern2 = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${name}["']`, 'i');
        const m2 = html.match(pattern2);
        return m2 ? m2[1].trim() : '';
    }
    extractJsonLd(html) {
        const results = [];
        const pattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([^<]*)<\/script>/gi;
        let m;
        while ((m = pattern.exec(html)) !== null) {
            try {
                const parsed = JSON.parse(m[1].trim());
                if (Array.isArray(parsed))
                    results.push(...parsed);
                else
                    results.push(parsed);
            }
            catch { }
        }
        return results;
    }
    extractSchemaOrgTypes(html) {
        const types = new Set();
        const pattern = /itemtype=["']https?:\/\/schema\.org\/([^"']+)["']/gi;
        let m;
        while ((m = pattern.exec(html)) !== null) {
            types.add(m[1]);
        }
        return Array.from(types);
    }
    hasFavicon(html) {
        return /rel=["'](shortcut )?icon["']/i.test(html) || /rel=["']apple-touch-icon["']/i.test(html);
    }
}
exports.SeoAuditService = SeoAuditService;
exports.seoAuditService = new SeoAuditService();
//# sourceMappingURL=seo-audit.service.js.map