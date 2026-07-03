export interface SearchInput {
    businessType: string;
    state?: string;
    city?: string;
    area?: string;
    country?: string;
    sources: string[];
}
export interface SourceQuery {
    source: string;
    query: string;
    url: string;
    fullSearchQuery: string;
    semanticKeyword?: string;
    categoryGroup?: string;
    priority?: number;
    isSemanticExpansion?: boolean;
}
export interface MultiQueryInput {
    keywords: string[];
    state?: string;
    city?: string;
    area?: string;
    country?: string;
    sources: string[];
}
export declare class SearchQueryBuilder {
    build(input: SearchInput): SourceQuery[];
    buildMultiQuery(input: MultiQueryInput): SourceQuery[];
}
export declare const searchQueryBuilder: SearchQueryBuilder;
//# sourceMappingURL=search-query-builder.d.ts.map