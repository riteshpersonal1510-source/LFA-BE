import mongoose, { Document } from 'mongoose';
export interface IWhatsAppCampaign extends Document {
    sessionId: string;
    status: 'created' | 'loading' | 'building' | 'ready' | 'running' | 'completed' | 'failed' | 'stopped' | 'logged_out';
    selectedLeadIds: string[];
    totalLeads: number;
    completedLeads: number;
    failedLeads: number;
    skippedLeads: number;
    currentLeadId: string | null;
    currentLeadIndex: number;
    currentStep: string;
    error: string | null;
    failureReason: string | null;
    logs: Array<{
        leadId: string;
        companyName: string;
        phone: string | null;
        status: string;
        timestamp: number;
        error?: string;
        message?: string;
        duration_ms?: number;
        attempt?: number;
        browser_state?: string;
    }>;
    createdAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
    eta: number | null;
    elapsedSeconds: number;
    processed: number;
    remaining: number;
    currentLead: string | null;
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
}
export declare const WhatsAppCampaign: mongoose.Model<IWhatsAppCampaign, {}, {}, {}, mongoose.Document<unknown, {}, IWhatsAppCampaign, {}, {}> & IWhatsAppCampaign & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=WhatsAppCampaign.d.ts.map