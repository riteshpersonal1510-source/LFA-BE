import { FooterAnalysis } from './types';
export declare class FooterAnalyzer {
    analyzeFooter(html: string): Promise<FooterAnalysis>;
    private detectCopyright;
    private detectPrivacyPolicy;
    private detectTermsPage;
    private countFooterLinks;
    private detectFooterContact;
    private getDefaultFooterAnalysis;
}
export declare const footerAnalyzer: FooterAnalyzer;
//# sourceMappingURL=footer-analyzer.d.ts.map