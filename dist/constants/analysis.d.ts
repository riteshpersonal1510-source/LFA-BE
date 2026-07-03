export declare const WEBSITE_STATUSES: readonly ["unknown", "no-website", "broken-website", "outdated-website", "average-website", "modern-website"];
export type WebsiteStatus = typeof WEBSITE_STATUSES[number];
export declare const QUALIFICATION_LEVELS: readonly ["high-potential", "medium-potential", "low-potential"];
export type QualificationLevel = typeof QUALIFICATION_LEVELS[number];
export declare const SSL_THRESHOLD_DAYS = 90;
export declare const RESPONSE_TIME_THRESHOLDS: {
    excellent: number;
    good: number;
    acceptable: number;
    slow: number;
};
export declare const SEO_SCORE_WEIGHTS: {
    metaTitle: number;
    metaDescription: number;
    mobileFriendly: number;
    hasContactPage: number;
    hasSocialLinks: number;
};
export declare const QUALIFICATION_RULES: {
    highPotential: {
        minScore: number;
        requires: string[];
    };
    mediumPotential: {
        minScore: number;
        requires: never[];
    };
    lowPotential: {
        minScore: number;
        requires: never[];
    };
};
//# sourceMappingURL=analysis.d.ts.map