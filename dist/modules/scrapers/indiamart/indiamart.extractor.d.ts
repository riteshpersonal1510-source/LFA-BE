import { Page } from 'playwright';
import type { IndiaMartRawListing } from './indiamart.types';
export declare function extractListings(page: Page, keyword: string, city?: string, area?: string): Promise<IndiaMartRawListing[]>;
//# sourceMappingURL=indiamart.extractor.d.ts.map