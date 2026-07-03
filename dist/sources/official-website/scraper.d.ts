import { BaseSource, SourceOptions, ScrapingResult } from '../../source-core/base-source';
import { SourceConfig } from '../../source-core/source-config';
export declare class OfficialWebsiteSource extends BaseSource {
    constructor(config?: Partial<SourceConfig>);
    scrape(options: SourceOptions): Promise<ScrapingResult>;
    private extractSearchLinks;
    private filterBusinessWebsites;
    private scrapeWebsite;
    private extractCompanyName;
    private extractEmail;
    private extractPhone;
    private extractAddress;
}
//# sourceMappingURL=scraper.d.ts.map