export declare const googleMapsSelectors: {
    searchInput: string;
    searchInputAlt: string;
    feedContainer: string;
    businessCardLink: string;
    businessNameInCard: string[];
    ratingInCard: string[];
    categoryInCard: string[];
    detailCompanyName: string[];
    detailCategory: string[];
    detailPhone: string[];
    detailAddress: string[];
    detailWebsite: string[];
    detailPanelScroll: string;
    detailRating: string[];
};
export declare function getFirstMatchText(page: any, selectors: string[]): Promise<string | null>;
export declare function getFirstMatchAttribute(page: any, selectors: string[], attr: string): Promise<string | null>;
export declare function extractWebsiteFromDetailPanel(page: any): Promise<string | null>;
export declare function extractPhoneFromDetailPanel(page: any): Promise<string | null>;
export declare function getAllTextContent(page: any, selector: string): Promise<string[]>;
//# sourceMappingURL=selectors.d.ts.map