import { BrowserPool } from '../browser/browser-pool';
import { ScraperSession } from './scraper-session';
import { ScrapeOptions, ScrapeResult } from '../types/scraper.types';
export declare class ScraperWorker {
    private browserPool;
    constructor(browserPool: BrowserPool);
    execute(session: ScraperSession, options: ScrapeOptions): Promise<ScrapeResult>;
    private navigateToMaps;
    private searchBusinesses;
    private scrollAndExtract;
    private scrollToBottom;
    private extractBusinessesFromPage;
    private extractSingleBusiness;
    private extractBusinessDataFromDetails;
    private getTextContent;
    private getAttribute;
    private isDuplicate;
    private calculateLeadScore;
    private storeLeads;
}
//# sourceMappingURL=scraper-worker.d.ts.map