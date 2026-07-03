export interface ContactDiscoveryResult {
    socialLinks: {
        facebook: string;
        instagram: string;
        linkedin: string;
        youtube: string;
        twitter: string;
        pinterest: string;
        threads: string;
        other: string[];
    };
    contactPageUrl: string;
    hasContactForm: boolean;
    contactFormAction: string;
}
export interface CrawledPageForContacts {
    url: string;
    html: string;
    text: string;
    links: string[];
}
export declare class ContactDiscoveryService {
    discoverFromPages(pages: CrawledPageForContacts[]): ContactDiscoveryResult;
}
export declare const contactDiscoveryService: ContactDiscoveryService;
//# sourceMappingURL=contact-discovery.service.d.ts.map