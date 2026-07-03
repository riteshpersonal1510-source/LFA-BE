export interface CrawlResult {
    url: string;
    title: string;
    content: string;
    links: string[];
    images: string[];
    metadata: {
        metaTitle?: string;
        metaDescription?: string;
        h1?: string;
        h2?: string[];
    };
    extractionTime: number;
}
export interface CrawlOptions {
    maxDepth?: number;
    maxPages?: number;
    timeout?: number;
    followExternalLinks?: boolean;
}
export declare class WebsiteCrawlerService {
    private browserManager;
    constructor();
    crawlWebsite(baseUrl: string, options?: CrawlOptions): Promise<{
        crawledPages: CrawlResult[];
        totalPages: number;
        crawlTime: number;
        status: 'success' | 'partial' | 'failed';
    }>;
    private crawlSinglePage;
    private isSameDomain;
    crawlAndExtractContacts(baseUrl: string, options?: CrawlOptions): Promise<{
        emails: string[];
        phones: string[];
        socialLinks: any;
        crawledPages: CrawlResult[];
    }>;
}
export declare const websiteCrawlerService: WebsiteCrawlerService;
//# sourceMappingURL=website-crawler.service.d.ts.map