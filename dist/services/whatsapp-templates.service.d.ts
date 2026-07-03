interface TemplateCacheEntry {
    website: string;
    no_website: string;
}
interface SenderInfo {
    name?: string;
    phone?: string;
    email?: string;
    website?: string;
}
interface LeadPlaceholderData {
    businessName?: string;
    ownerName?: string;
    city?: string;
    area?: string;
    state?: string;
    website?: string;
    phone?: string;
    category?: string;
    rating?: number | string;
    leadScore?: number | string;
    companyName?: string;
}
export declare class WhatsAppTemplatesService {
    private templateCache;
    private getDefaultWebsiteMessage;
    private getDefaultNoWebsiteMessage;
    getTemplates(): Promise<{
        website: {
            name: string;
            message: string;
        };
        no_website: {
            name: string;
            message: string;
        };
    }>;
    getTemplatesForCampaign(campaignId: string): Promise<TemplateCacheEntry>;
    refreshCache(campaignId?: string): void;
    updateTemplate(type: 'website' | 'no_website', message: string, name?: string): Promise<void>;
    resetToDefaults(): Promise<void>;
    sanitizeMessage(message: string): string;
    getCharCount(message: string): number;
    isOverLimit(message: string, limit?: number): boolean;
    replacePlaceholders(message: string, lead: LeadPlaceholderData, senderInfo?: SenderInfo): string;
    getSampleLeadData(): LeadPlaceholderData;
}
export declare const whatsAppTemplatesService: WhatsAppTemplatesService;
export {};
//# sourceMappingURL=whatsapp-templates.service.d.ts.map