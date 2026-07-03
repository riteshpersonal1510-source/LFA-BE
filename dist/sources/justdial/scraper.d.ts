import { BaseSource, SourceOptions, ScrapingResult } from '../../source-core/base-source';
import { SourceConfig } from '../../source-core/source-config';
export declare class JustdialSource extends BaseSource {
    constructor(config?: Partial<SourceConfig>);
    scrape(options: SourceOptions): Promise<ScrapingResult>;
    private extractVisibleBusinesses;
    private scrollPage;
}
//# sourceMappingURL=scraper.d.ts.map