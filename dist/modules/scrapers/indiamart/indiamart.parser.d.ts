import type { IndiaMartRawListing, IndiaMartEnrichedLead } from './indiamart.types';
export declare function parseListingPage(html: string, existingNames: Set<string>): IndiaMartRawListing[];
export declare function parseProfilePage(html: string, profileUrl: string): Partial<IndiaMartEnrichedLead>;
//# sourceMappingURL=indiamart.parser.d.ts.map