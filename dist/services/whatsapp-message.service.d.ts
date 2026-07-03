export interface GeneratedMessage {
    leadId: string;
    companyName: string;
    phone: string;
    normalizedPhone: string;
    message: string;
    templateType: 'website' | 'no-website';
    hasWebsite: boolean;
    whatsappUrl: string;
    skipReason: string | null;
}
export declare class WhatsAppMessageService {
    generateMessages(leadIds: string[]): Promise<{
        messages: GeneratedMessage[];
        skipped: Array<{
            leadId: string;
            companyName: string;
            reason: string;
        }>;
    }>;
}
export declare const whatsAppMessageService: WhatsAppMessageService;
//# sourceMappingURL=whatsapp-message.service.d.ts.map