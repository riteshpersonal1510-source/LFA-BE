"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.websiteAuditService = exports.WebsiteAuditService = void 0;
class WebsiteAuditService {
    audit(data) {
        const metadata = data.websiteMetadata || {};
        const quality = data.websiteQuality || {};
        const footer = data.footerAudit || {};
        const socialMedia = {};
        if (data.socialLinks) {
            for (const [platform, url] of Object.entries(data.socialLinks)) {
                socialMedia[platform] = !!url;
            }
        }
        const emailPresent = !!(data.email || (data.emails?.length));
        const phonePresent = !!(data.phone || (data.phones?.length));
        const cookieBanner = false;
        const detectedIssues = [];
        if (!data.websiteReachable)
            detectedIssues.push('Website is not reachable');
        if (!metadata.httpsEnabled)
            detectedIssues.push('HTTPS not enabled');
        if (!metadata.title)
            detectedIssues.push('Missing page title');
        if (!metadata.description)
            detectedIssues.push('Missing meta description');
        if (!metadata.favicon)
            detectedIssues.push('Missing favicon');
        if (!metadata.logo)
            detectedIssues.push('Missing logo');
        if (quality.contactPageStatus === 'missing' || quality.contactPageStatus === 'broken')
            detectedIssues.push('Missing or broken contact page');
        if (quality.aboutPageStatus === 'missing')
            detectedIssues.push('Missing about page');
        if (quality.servicesPageStatus === 'missing')
            detectedIssues.push('Missing services page');
        if (!footer.privacyPolicy)
            detectedIssues.push('Missing privacy policy');
        if (!footer.termsPage)
            detectedIssues.push('Missing terms and conditions');
        if (!quality.hasContactForm)
            detectedIssues.push('No contact form');
        if (!emailPresent)
            detectedIssues.push('No email found');
        if (!phonePresent)
            detectedIssues.push('No phone found');
        if (Object.keys(socialMedia).length === 0)
            detectedIssues.push('No social media presence');
        const score = Math.max(0, Math.min(100, 100 - detectedIssues.length * 8));
        return {
            https: !!metadata.httpsEnabled,
            pageTitle: metadata.title || '',
            metaDescription: metadata.description || '',
            favicon: metadata.favicon || '',
            logo: metadata.logo || '',
            contactPage: quality.contactPageStatus || 'missing',
            aboutPage: quality.aboutPageStatus || 'missing',
            servicesPage: quality.servicesPageStatus || 'missing',
            privacyPolicy: !!footer.privacyPolicy,
            terms: !!footer.termsPage,
            cookieBanner,
            contactForm: !!quality.hasContactForm,
            emailPresent,
            phonePresent,
            socialMedia,
            cms: metadata.cms || '',
            detectedIssues,
            score,
        };
    }
}
exports.WebsiteAuditService = WebsiteAuditService;
exports.websiteAuditService = new WebsiteAuditService();
//# sourceMappingURL=website-audit.service.js.map