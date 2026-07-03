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
export declare class WebsiteMetadataService {
    extractFromPages(pages: CrawledPageForMetadata[]): WebsiteMetadata;
    private extractTitle;
    private extractMetaDescription;
    private extractFavicon;
    private extractLogo;
    private extractLanguage;
    private extractCanonical;
    private detectCms;
    private resolveUrl;
}
export declare const websiteMetadataService: WebsiteMetadataService;
//# sourceMappingURL=website-metadata.service.d.ts.map