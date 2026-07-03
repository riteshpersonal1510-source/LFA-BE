import type { FilterQuery } from 'mongoose';
import type { ILead } from '../../../models/Lead';
export interface LeadFilterOptions {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    source?: string;
    sources?: string[];
    state?: string;
    city?: string;
    area?: string;
    businessType?: string;
    status?: 'active' | 'pending' | 'qualified' | 'disqualified';
    quality?: 'excellent' | 'good' | 'average' | 'poor';
    confidence?: number;
    minConfidence?: number;
    maxConfidence?: number;
    hasWebsite?: boolean;
    hasPhone?: boolean;
    hasEmail?: boolean;
    socialOnly?: boolean;
    verifiedOnly?: boolean;
    hasWhatsApp?: boolean;
    validationStatus?: 'validated' | 'rejected' | 'needs-review';
    qualificationLevel?: 'high-potential' | 'medium-potential' | 'low-potential';
    websiteType?: string;
    searchSessionId?: string;
    enrichmentStatus?: 'pending' | 'running' | 'completed' | 'failed';
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface FilterCount {
    value: string;
    count: number;
}
export interface FilterOptionsResponse {
    categories: FilterCount[];
    sources: FilterCount[];
    states: string[];
    cities: string[];
    areas: string[];
    businessTypes: FilterCount[];
    qualities: FilterCount[];
    statuses: FilterCount[];
}
export declare class LeadFilterService {
    buildQuery(options: LeadFilterOptions): FilterQuery<ILead>;
    buildSortOptions(sortField?: string, sortOrder?: 'asc' | 'desc'): Record<string, 1 | -1>;
    getFilteredLeads(options: LeadFilterOptions): Promise<{
        leads: {
            id: string | undefined;
            _id: {
                toString(): string;
            };
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
        duration: number;
    }>;
    getFilterOptions(filters?: {
        state?: string;
        city?: string;
        area?: string;
    }): Promise<FilterOptionsResponse>;
    private getCategoryCounts;
    private getCounts;
}
export declare const leadFilterService: LeadFilterService;
//# sourceMappingURL=leadFilter.service.d.ts.map