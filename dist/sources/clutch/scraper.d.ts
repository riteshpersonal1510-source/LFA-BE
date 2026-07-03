import { BaseSource, SourceOptions, ScrapingResult } from '../../source-core/base-source';
import { SourceConfig } from '../../source-core/source-config';
export declare class ClutchSource extends BaseSource {
    constructor(config?: Partial<SourceConfig>);
    scrape(options: SourceOptions): Promise<ScrapingResult>;
    private searchBusinesses;
    private extractBusinesses;
    private extractBusinessData;
    private getText;
    protected isDuplicate(business: any, existing: any[]): boolean;
}
//# sourceMappingURL=scraper.d.ts.map