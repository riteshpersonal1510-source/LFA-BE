export interface PhoneExtractionResult {
    phones: string[];
    primaryPhone: string;
    whatsappNumber: string;
}
export declare class PhoneExtractionService {
    normalizePhone(raw: string): string;
    isValidPhone(phone: string): boolean;
    extractPhones(text: string): string[];
    extractWhatsAppLinks(html: string, links: string[]): string;
    selectPrimaryPhone(phones: string[]): string;
    extractFromCrawledPages(pages: Array<{
        url: string;
        content: string;
        html: string;
        links: string[];
    }>): PhoneExtractionResult;
}
export declare const phoneExtractionService: PhoneExtractionService;
//# sourceMappingURL=phone-extraction.service.d.ts.map