export interface SocialMediaLinks {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
    youtube?: string;
    whatsapp?: string;
    telegram?: string;
}
export interface SocialExtractionOptions {
    timeout?: number;
    maxRetries?: number;
}
export declare class SocialExtractorService {
    private browserManager;
    extractSocialLinks(website: string, options?: SocialExtractionOptions): Promise<SocialMediaLinks>;
    extractFromContent(content: string, _baseUrl: string): Promise<SocialMediaLinks>;
    checkSocialMediaLink(url: string, timeout?: number): Promise<boolean>;
}
export declare const socialExtractorService: SocialExtractorService;
//# sourceMappingURL=social-extractor.service.d.ts.map