import { ScrapeOptions, ScrapeResult } from '../types/scraper.types';
export declare class GoogleMapsScraper {
    private browserManager;
    private baseUrl;
    private results;
    private totalExtracted;
    private totalDuplicates;
    private totalFound;
    private scrapedCount;
    constructor();
    scrape(options: ScrapeOptions): Promise<ScrapeResult>;
    private buildSearchQuery;
    private navigateToMaps;
    private searchBusinesses;
    private scrollAndExtract;
    private scrollToBottom;
    private extractBusinessesFromPage;
    private extractSingleBusiness;
    private extractBusinessDataFromDetails;
    private validateAreaRelevance;
    private getTextContent;
    private getAttribute;
    private isDuplicate;
    private calculateLeadScore;
    private storeLeads;
}
//# sourceMappingURL=google-maps.scraper.d.ts.map