import { BaseSource, SourceOptions, ScrapingResult } from '../../source-core/base-source';
import { SourceConfig } from '../../source-core/source-config';
export declare class GoogleMapsSource extends BaseSource {
    constructor(config?: Partial<SourceConfig>);
    scrape(options: SourceOptions): Promise<ScrapingResult>;
    private scrollFeed;
    private detectCardData;
    private extractSingleDetail;
    private extractWebsiteLayered;
    private extractPhoneLayered;
    private isValidWebsite;
    private normalizeWebsite;
    private resolveGoogleRedirect;
    private normalizePhone;
    private cleanDetailText;
    private waitForContentStable;
    private enhancedScrollFeed;
    private retryFailedQuery;
    private tryQueryVariations;
}
//# sourceMappingURL=scraper.d.ts.map