export declare class OutreachService {
    generateOutreachForLead(leadId: string): Promise<{
        success: boolean;
        data: (import("mongoose").FlattenMaps<import("../models/Lead").ILead> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        }) | null;
    }>;
    generateOutreachForMultipleLeads(leadIds: string[]): Promise<{
        success: boolean;
        data: {
            results: ({
                leadId: string;
                success: boolean;
                error?: undefined;
            } | {
                leadId: string;
                success: boolean;
                error: any;
            })[];
            successful: number;
            failed: number;
            total: number;
        };
    }>;
    generateOutreachForLeadsWithoutOutreach(limit?: number): Promise<{
        success: boolean;
        data: {
            results: ({
                leadId: string;
                success: boolean;
                error?: undefined;
            } | {
                leadId: string;
                success: boolean;
                error: any;
            })[];
            successful: number;
            failed: number;
            total: number;
        };
    } | {
        success: boolean;
        data: {
            results: never[];
            successful: number;
            failed: number;
            total: number;
            message: string;
        };
    }>;
    getOutreachStats(): Promise<{
        total: number;
        outreachCompleted: number;
        pendingOutreach: number;
        highProbabilityLeads: number;
        readyForProposal: number;
        respondedLeads: number;
        interestedLeads: number;
        highRedesignProspects: number;
        highSEOProspects: number;
    }>;
    getLeadOutreach(leadId: string): Promise<{
        generatedEmails: import("mongoose").FlattenMaps<{
            type: string;
            subject: string;
            body: string;
        }>[];
        generatedWhatsAppMessages: import("mongoose").FlattenMaps<{
            type: string;
            content: string;
        }>[];
        generatedProposals: import("mongoose").FlattenMaps<{
            type: string;
            title: string;
            html: string;
            summary: string;
            services: string[];
            estimatedTimeline: string;
            estimatedInvestment: string;
        }>[];
        followupSequence: import("mongoose").FlattenMaps<{
            stage: number;
            type: "email" | "whatsapp";
            subject?: string;
            content: string;
            delayDays: number;
        }>[];
        outreachHistory: import("mongoose").FlattenMaps<{
            type: "email" | "whatsapp" | "proposal" | "followup";
            content: string;
            subject?: string;
            generatedAt: Date;
            status: "pending" | "sent" | "opened" | "responded";
            followUpStage?: number;
            response?: string;
        }>[];
        outreachProbability: "high" | "medium" | "low" | null;
        outreachProbabilityScore: number | null;
        crmOutreachStatus: "interested" | "responded" | "outreach_pending" | "email_sent" | "whatsapp_sent" | "followup_pending" | "proposal_sent" | "closed";
        outreachCompleted: boolean;
        lastOutreachDate: Date | null;
    }>;
    updateOutreachStatus(leadId: string, status: string): Promise<{
        success: boolean;
        message: string;
    }>;
    private toLeadInput;
}
export declare const outreachService: OutreachService;
//# sourceMappingURL=outreach.service.d.ts.map