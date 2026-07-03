export interface ExtractedEmail {
    email: string;
    source: 'website' | 'contact_page' | 'footer' | 'about_page' | 'unknown';
    confidence: 'high' | 'medium' | 'low';
    context?: string;
}
export declare function extractEmailsFromHtml(html: string, source?: ExtractedEmail['source']): ExtractedEmail[];
export declare function extractEmailsFromText(text: string, source?: ExtractedEmail['source']): ExtractedEmail[];
export declare function isBusinessEmail(email: string): boolean;
export declare function isSocialEmail(email: string): boolean;
export declare function getEmailType(email: string): 'business' | 'social' | 'unknown';
//# sourceMappingURL=email-extract.d.ts.map