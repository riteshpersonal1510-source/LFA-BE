export interface SeoAuditResult {
    title: string;
    titleLength: number;
    titleOk: boolean;
    metaDescription: string;
    metaDescriptionLength: number;
    metaDescriptionOk: boolean;
    h1Count: number;
    h1Present: boolean;
    h1Text: string;
    robotsMeta: string;
    canonicalUrl: string;
    canonicalPresent: boolean;
    ogTitle: string;
    ogDescription: string;
    ogImage: string;
    ogPresent: boolean;
    twitterCard: string;
    twitterPresent: boolean;
    jsonLdPresent: boolean;
    jsonLdTypes: string[];
    hasSchemaOrg: boolean;
    schemaOrgTypes: string[];
    faviconPresent: boolean;
    score: number;
    issues: string[];
}
export declare class SeoAuditService {
    auditFromHtml(html: string): SeoAuditResult;
    private extract;
    private extractAll;
    private extractMetaDescription;
    private extractMetaRobots;
    private extractCanonical;
    private extractMetaProperty;
    private extractMetaName;
    private extractJsonLd;
    private extractSchemaOrgTypes;
    private hasFavicon;
}
export declare const seoAuditService: SeoAuditService;
//# sourceMappingURL=seo-audit.service.d.ts.map