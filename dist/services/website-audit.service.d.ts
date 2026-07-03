export interface WebsiteAuditResult {
    https: boolean;
    pageTitle: string;
    metaDescription: string;
    favicon: string;
    logo: string;
    contactPage: 'found' | 'missing' | 'broken';
    aboutPage: 'found' | 'missing';
    servicesPage: 'found' | 'missing';
    privacyPolicy: boolean;
    terms: boolean;
    cookieBanner: boolean;
    contactForm: boolean;
    emailPresent: boolean;
    phonePresent: boolean;
    socialMedia: Record<string, boolean>;
    cms: string;
    detectedIssues: string[];
    score: number;
}
export interface WebsiteAuditInput {
    websiteReachable?: boolean;
    websiteMetadata?: {
        title?: string;
        description?: string;
        favicon?: string;
        logo?: string;
        cms?: string;
        httpsEnabled?: boolean;
    };
    websiteQuality?: {
        contactPageStatus?: string;
        aboutPageStatus?: string;
        servicesPageStatus?: string;
        hasContactForm?: boolean;
        hasEmail?: boolean;
        hasPhone?: boolean;
        issues?: string[];
        score?: number;
    };
    footerAudit?: {
        privacyPolicy?: boolean;
        termsPage?: boolean;
    };
    socialLinks?: Record<string, string | undefined>;
    emails?: string[];
    phones?: string[];
    email?: string;
    phone?: string;
}
export declare class WebsiteAuditService {
    audit(data: WebsiteAuditInput): WebsiteAuditResult;
}
export declare const websiteAuditService: WebsiteAuditService;
//# sourceMappingURL=website-audit.service.d.ts.map