import { BaseSource, SourceOptions, ScrapingResult } from '../../source-core/base-source';
import { SourceConfig } from '../../source-core/source-config';
export declare class IndiaMartSource extends BaseSource {
    constructor(config?: Partial<SourceConfig>);
    scrape(options: SourceOptions): Promise<ScrapingResult>;
}
//# sourceMappingURL=scraper.d.ts.map