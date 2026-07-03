import { ContactAudit } from './types';
export declare class ContactDetector {
    detectContactInfo(html: string): Promise<ContactAudit>;
    private detectPhone;
    private detectEmail;
    private detectContactForm;
    private detectGoogleMaps;
    private detectAddress;
    private detectWhatsAppButton;
    private getDefaultContactAudit;
}
export declare const contactDetector: ContactDetector;
//# sourceMappingURL=contact-detector.d.ts.map