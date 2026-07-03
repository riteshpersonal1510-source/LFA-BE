import { ILead } from '../models/Lead';
import { QualificationLevel, WebsiteStatus } from '../types/analysis.types';
export interface LeadSortOptions {
    field?: 'leadScore' | 'createdAt' | 'companyName' | 'rating' | 'finalConfidence';
    order?: 'asc' | 'desc';
}
export interface LeadQueryOptions {
    page?: number;
    limit?: number;
    keyword?: string;
    location?: string;
    state?: string;
    city?: string;
    area?: string;
    businessType?: string;
    category?: string;
    source?: string;
    sources?: string[];
    minRating?: number;
    minLeadScore?: number;
    maxLeadScore?: number;
    websiteStatus?: WebsiteStatus;
    qualificationLevel?: QualificationLevel;
    hasWebsite?: boolean;
    hasPhone?: boolean;
    sort?: LeadSortOptions;
    minConfidence?: number;
    maxConfidence?: number;
    validationStatus?: 'validated' | 'rejected' | 'needs-review';
    aiQuality?: 'excellent' | 'good' | 'average' | 'poor';
}
export interface LeadSearchResult {
    leads: ILead[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export declare class LeadService {
    getAllLeads(options?: LeadQueryOptions): Promise<LeadSearchResult>;
    getLeadById(id: string): Promise<ILead | null>;
    createLead(data: Partial<ILead>): Promise<ILead>;
    updateLead(id: string, data: Partial<ILead>): Promise<ILead | null>;
    deleteLead(id: string): Promise<boolean>;
    bulkCreateLeads(leads: Partial<ILead>[]): Promise<{
        created: number;
        duplicates: number;
    }>;
    deleteAllLeads(): Promise<{
        deletedCount: number;
    }>;
    getDistinctCategories(): Promise<string[]>;
    getDuplicateCheck(companyName: string, phone?: string): Promise<boolean>;
}
//# sourceMappingURL=lead.service.d.ts.map