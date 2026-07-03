import type { ExpandedKeyword } from '../modules/search/businessCategoryEngine';
export interface SemanticSearchQuery {
    keyword: string;
    originalKeyword: string;
    categoryGroupId: string;
    categoryGroupName: string;
    priority: number;
    isPrimary: boolean;
    localizedQuery: string;
    sourceQueries: SemanticSourceQuery[];
}
export interface SemanticSourceQuery {
    source: string;
    query: string;
    url: string;
}
export interface SemanticExpansionResult {
    originalKeyword: string;
    matchedCategory: {
        id: string;
        name: string;
    } | null;
    expandedKeywords: ExpandedKeyword[];
    queries: SemanticSearchQuery[];
    coverage: {
        totalQueries: number;
        primaryQueries: number;
        expandedQueries: number;
        groupsCovered: string[];
    };
    validationError?: string;
}
export declare class SemanticSearchService {
    validateInput(input: string): string | null;
    validateSources(sources: string[]): string | null;
    deduplicateQueries(queries: SemanticSearchQuery[]): SemanticSearchQuery[];
    expand(input: string, sources: string[], state?: string, city?: string, area?: string): SemanticExpansionResult;
    expandWithAIFallback(input: string, sources: string[], state?: string, city?: string, area?: string): SemanticExpansionResult;
    getLimitedExpandedQueries(input: string, sources: string[], state?: string, city?: string, area?: string, maxQueries?: number): SemanticSearchQuery[];
    private buildLocalizedQuery;
    private buildSourceQueries;
    getSearchCoverageReport(input: string, sources: string[], state?: string, city?: string, area?: string): {
        originalKeyword: string;
        matchedCategory: {
            id: string;
            name: string;
        } | null;
        coverage: {
            totalQueries: number;
            primaryQueries: number;
            expandedQueries: number;
            groupsCovered: string[];
        };
        expandedKeywordsPreview: string[];
        totalExpandedKeywords: number;
        totalQueries: number;
        totalGoogleMapsQueries: number;
        totalJustdialQueries: number;
        totalIndiaMartQueries: number;
        totalClutchQueries: number;
    };
}
export declare const semanticSearchService: SemanticSearchService;
//# sourceMappingURL=semantic-search.service.d.ts.map