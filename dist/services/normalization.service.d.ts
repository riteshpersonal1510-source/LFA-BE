import { LeadData } from '../source-core/base-source';
export interface NormalizedLead {
    companyName: string;
    website?: string;
    phone?: string;
    email?: string;
    address?: string;
    category?: string;
    rating?: number;
    reviewsCount?: number;
    source: string;
    sourceUrl?: string;
    leadScore: number;
    relevanceScore: number;
    validatedCategory: string;
    sources: string[];
    href?: string;
    placeId?: string;
    createdAt: string;
}
export declare class NormalizationService {
    normalizePhone(raw: string | undefined | null): string | undefined;
    normalizeWebsite(raw: string | undefined | null): string | undefined;
    normalizeEmail(raw: string | undefined | null): string | undefined;
    normalizeAddress(raw: string | undefined | null): string | undefined;
    normalizeCategory(raw: string | undefined | null): string | undefined;
    normalize(data: LeadData): Partial<NormalizedLead>;
}
export declare const normalizationService: NormalizationService;
//# sourceMappingURL=normalization.service.d.ts.map