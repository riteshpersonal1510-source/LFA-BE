import { TrustScore, FooterAnalysis, SocialAudit, ContactAudit, WebsiteFreshness } from './types';
export declare class TrustScoreEngine {
    calculateTrustScore(sslEnabled: boolean, footerAnalysis: FooterAnalysis, socialAudit: SocialAudit, contactAudit: ContactAudit, websiteFreshness: WebsiteFreshness, seoScore: number, responsiveScore: number): TrustScore;
    private getDefaultTrustScore;
}
export declare const trustScoreEngine: TrustScoreEngine;
//# sourceMappingURL=trust-score-engine.d.ts.map