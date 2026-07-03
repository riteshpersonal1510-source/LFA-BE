import { ILead } from '../models/Lead';
import { QualificationLevel, WebsiteStatus, AnalysisResult } from '../types/analysis.types';
export declare class LeadQualificationService {
    qualifyLead(leadId: string, website?: string): Promise<ILead | null>;
    bulkQualifyLeads(options?: {
        limit?: number;
        websiteStatus?: WebsiteStatus;
        minLeadScore?: number;
    }): Promise<AnalysisResult>;
    getQualifiedLeads(options?: {
        page?: number;
        limit?: number;
        qualificationLevel?: QualificationLevel;
        websiteStatus?: WebsiteStatus;
        minLeadScore?: number;
        maxLeadScore?: number;
    }): Promise<{
        leads: ILead[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getQualificationStats(): Promise<{
        totalLeads: number;
        qualifiedLeads: number;
        byStatus: Record<string, number>;
        byLevel: Record<string, number>;
        avgScore: number;
    }>;
    getLeadsByLevel(level: QualificationLevel): Promise<ILead[]>;
    getLeadsByStatus(status: WebsiteStatus): Promise<ILead[]>;
    requalifyUnanalyzedLeads(options?: {
        limit?: number;
    }): Promise<AnalysisResult>;
}
export declare const leadQualificationService: LeadQualificationService;
//# sourceMappingURL=lead-qualification.service.d.ts.map