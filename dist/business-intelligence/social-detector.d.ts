import { SocialAudit } from './types';
export declare class SocialDetector {
    detectSocialPresence(html: string): Promise<SocialAudit>;
    private detectInstagram;
    private detectFacebook;
    private detectLinkedIn;
    private detectTwitter;
    private detectYouTube;
    private detectWhatsApp;
    private detectPlatform;
    private extractSocialLinks;
    private calculateSocialScore;
    private countPlatforms;
    private getDefaultSocialAudit;
}
export declare const socialDetector: SocialDetector;
//# sourceMappingURL=social-detector.d.ts.map