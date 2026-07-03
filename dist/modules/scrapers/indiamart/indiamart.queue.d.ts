import { Page } from 'playwright';
import type { IndiaMartRawListing, ScraperStats } from './indiamart.types';
import type { ScraperLead } from '../../../core/scraper-engine/types';
export declare class IndiaMartProfileQueue {
    private limit;
    private page;
    private results;
    private failed;
    private stats;
    private context;
    constructor(page: Page, context: {
        keyword: string;
        location: string;
        area?: string;
        city?: string;
        state?: string;
        businessType: string;
    });
    processAll(listings: IndiaMartRawListing[]): Promise<{
        leads: ScraperLead[];
        stats: ScraperStats;
    }>;
    private processSingle;
    getResults(): ScraperLead[];
    getStats(): ScraperStats;
    getFailed(): string[];
}
//# sourceMappingURL=indiamart.queue.d.ts.map