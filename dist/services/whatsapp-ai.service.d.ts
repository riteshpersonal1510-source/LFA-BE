interface StartCampaignResponse {
    sessionId: string;
    status: string;
    totalLeads: number;
    completed: number;
    failed: number;
    currentLead: string;
}
interface SessionStatusResponse {
    sessionId: string;
    status: string;
    totalLeads: number;
    completed: number;
    failed: number;
    currentLead: string | null;
    currentLeadIndex: number;
    currentStep: string;
    error: string | null;
    eta: number | null;
    elapsedSeconds: number;
    processed: number;
    remaining: number;
    leads: Array<{
        leadId: string;
        companyName: string;
        phone: string | null;
        website: string;
        city: string;
        messageType: string;
        queuePosition: number;
        status: string;
        error: string | null;
        attempts: number;
        durationMs: number;
        browserState: string;
        updatedAt: number;
        completedAt: number | null;
    }>;
    createdAt: number;
    completedAt: number | null;
}
export declare class WhatsAppAIService {
    private client;
    constructor();
    checkHealth(): Promise<{
        success: boolean;
        status: string;
        url: string;
    }>;
    startCampaign(leadIds: string[]): Promise<StartCampaignResponse>;
    getSessionStatus(sessionId: string): Promise<SessionStatusResponse>;
    stopCampaign(sessionId: string): Promise<{
        sessionId: string;
        status: string;
    }>;
    generateMessages(leadIds: string[], campaignId?: string): Promise<Record<string, unknown>>;
}
export declare const whatsAppAIService: WhatsAppAIService;
export {};
//# sourceMappingURL=whatsapp-ai.service.d.ts.map