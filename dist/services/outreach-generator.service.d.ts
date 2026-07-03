export interface OutreachResult {
    coldEmail: string;
    whatsappMessage: string;
    callScript: string;
    websiteProposal: string;
    subject: string;
}
export interface OutreachData {
    companyName: string;
    website?: string;
    email?: string;
    phone?: string;
    category?: string;
    city?: string;
    state?: string;
    rating?: number;
    reviewsCount?: number;
    websiteReachable?: boolean;
    websiteQuality?: {
        score?: number;
        issues?: string[];
    };
    businessStatus?: string;
}
export declare class OutreachGeneratorService {
    generate(data: OutreachData): OutreachResult;
    private generateColdEmail;
    private generateWhatsApp;
    private generateCallScript;
    private generateProposal;
}
export declare const outreachGeneratorService: OutreachGeneratorService;
//# sourceMappingURL=outreach-generator.service.d.ts.map