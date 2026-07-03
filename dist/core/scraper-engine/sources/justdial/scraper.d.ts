import { ScraperResult, ScraperOptions } from '../../types';
export declare class JustDialScraper {
    private allLeads;
    private allScrapedNames;
    scrape(options: ScraperOptions & {
        semanticKeyword?: string;
    }): Promise<ScraperResult>;
    private extractVisibleBusinesses;
    private scrollPage;
}
//# sourceMappingURL=scraper.d.ts.map