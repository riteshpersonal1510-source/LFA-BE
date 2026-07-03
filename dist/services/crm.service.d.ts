import { PipelineStage, ActivityType, CRMStats, LeadDetails, CRMAnalytics, CRMUpdateFields } from '../crm/types';
export declare class CRMService {
    getAllLeads(options?: {
        page?: number;
        limit?: number;
    }): Promise<{
        leads: any[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getLeadsByStage(stage: PipelineStage, options?: {
        page?: number;
        limit?: number;
    }): Promise<{
        leads: any[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    updateLeadStage(leadId: string, newStage: PipelineStage, userId: string): Promise<{
        success: boolean;
        message: string;
        lead?: any;
        activity?: any;
    }>;
    updateLeadCRMFields(leadId: string, fields: CRMUpdateFields, userId: string): Promise<{
        success: boolean;
        message: string;
        lead?: any;
    }>;
    addNote(leadId: string, content: string, userId: string): Promise<{
        success: boolean;
        message: string;
        note?: any;
    }>;
    updateNote(noteId: string, content: string, userId: string): Promise<{
        success: boolean;
        message: string;
        note?: any;
    }>;
    deleteNote(noteId: string, userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getNotes(leadId: string): Promise<any[]>;
    createFollowUp(leadId: string, dueDate: Date, note?: string, userId?: string): Promise<{
        success: boolean;
        message: string;
        followUp?: any;
    }>;
    updateFollowUp(followUpId: string, updates: {
        dueDate?: Date;
        note?: string;
        completed?: boolean;
    }, userId: string): Promise<{
        success: boolean;
        message: string;
        followUp?: any;
    }>;
    deleteFollowUp(followUpId: string, userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getFollowUps(leadId: string): Promise<any[]>;
    getActivities(leadId: string, options?: {
        limit?: number;
        type?: ActivityType;
    }): Promise<any[]>;
    getPipeline(): Promise<{
        stages: {
            id: PipelineStage;
            label: string;
            order: number;
            leads: any[];
        }[];
    }>;
    getCRMStats(): Promise<CRMStats>;
    getCRMAnalytics(): Promise<CRMAnalytics>;
    getLeadDetails(leadId: string): Promise<LeadDetails | null>;
    assignLead(leadId: string, userId: string, assignedBy: string): Promise<{
        success: boolean;
        message: string;
        lead?: any;
    }>;
    moveLead(leadId: string, fromStage: PipelineStage, toStage: PipelineStage, userId: string): Promise<{
        success: boolean;
        message: string;
        lead?: any;
    }>;
    private getStageLabel;
}
export declare const crmService: CRMService;
//# sourceMappingURL=crm.service.d.ts.map