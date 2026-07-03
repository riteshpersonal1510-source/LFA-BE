export interface CategoryGroup {
    id: string;
    name: string;
    keywords: string[];
    priority: number;
}
export interface ExpandedKeyword {
    keyword: string;
    originalQuery: string;
    categoryGroupId: string;
    categoryGroupName: string;
    priority: number;
    isPrimary: boolean;
}
export declare function expandKeyword(input: string): ExpandedKeyword[];
export declare function getCategoryGroup(input: string): CategoryGroup | null;
export declare function getAllCategoryGroups(): CategoryGroup[];
export declare function getCategoryGroupsByPriority(ascending?: boolean): CategoryGroup[];
export declare function findAISemanticMatch(input: string): string[];
export declare const businessCategoryEngine: {
    expandKeyword: typeof expandKeyword;
    getCategoryGroup: typeof getCategoryGroup;
    getAllCategoryGroups: typeof getAllCategoryGroups;
    getCategoryGroupsByPriority: typeof getCategoryGroupsByPriority;
    findAISemanticMatch: typeof findAISemanticMatch;
};
//# sourceMappingURL=businessCategoryEngine.d.ts.map