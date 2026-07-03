import type { ScraperResult, ScraperOptions } from '../../../core/scraper-engine/types';
export declare class IndiaMartScraper {
    scrape(options: ScraperOptions & {
        semanticKeyword?: string;
    }): Promise<ScraperResult>;
    private deduplicateListings;
}
//# sourceMappingURL=indiamart.scraper.d.ts.map