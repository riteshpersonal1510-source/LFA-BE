export interface ContactPageInfo {
    url: string;
    hasContactForm: boolean;
    hasEmail: boolean;
    hasPhone: boolean;
    hasAddress: boolean;
    formFields: string[];
    extractionTime: number;
}
export declare class ContactPageDetectorService {
    private browserManager;
    detectContactPages(website: string): Promise<ContactPageInfo[]>;
    private analyzeContactPage;
    isContactPage(url: string): Promise<boolean>;
}
export declare const contactPageDetectorService: ContactPageDetectorService;
//# sourceMappingURL=contact-page-detector.service.d.ts.map