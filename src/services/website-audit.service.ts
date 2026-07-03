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

export class WebsiteAuditService {
  audit(data: WebsiteAuditInput): WebsiteAuditResult {
    const metadata = data.websiteMetadata || {};
    const quality = data.websiteQuality || {};
    const footer = data.footerAudit || {};

    const socialMedia: Record<string, boolean> = {};
    if (data.socialLinks) {
      for (const [platform, url] of Object.entries(data.socialLinks)) {
        socialMedia[platform] = !!url;
      }
    }

    const emailPresent = !!(data.email || (data.emails?.length));
    const phonePresent = !!(data.phone || (data.phones?.length));
    const cookieBanner = false; // Not reliably detected without HTML scan

    const detectedIssues: string[] = [];
    if (!data.websiteReachable) detectedIssues.push('Website is not reachable');
    if (!metadata.httpsEnabled) detectedIssues.push('HTTPS not enabled');
    if (!metadata.title) detectedIssues.push('Missing page title');
    if (!metadata.description) detectedIssues.push('Missing meta description');
    if (!metadata.favicon) detectedIssues.push('Missing favicon');
    if (!metadata.logo) detectedIssues.push('Missing logo');
    if (quality.contactPageStatus === 'missing' || quality.contactPageStatus === 'broken') detectedIssues.push('Missing or broken contact page');
    if (quality.aboutPageStatus === 'missing') detectedIssues.push('Missing about page');
    if (quality.servicesPageStatus === 'missing') detectedIssues.push('Missing services page');
    if (!footer.privacyPolicy) detectedIssues.push('Missing privacy policy');
    if (!footer.termsPage) detectedIssues.push('Missing terms and conditions');
    if (!quality.hasContactForm) detectedIssues.push('No contact form');
    if (!emailPresent) detectedIssues.push('No email found');
    if (!phonePresent) detectedIssues.push('No phone found');
    if (Object.keys(socialMedia).length === 0) detectedIssues.push('No social media presence');

    const score = Math.max(0, Math.min(100, 100 - detectedIssues.length * 8));

    return {
      https: !!metadata.httpsEnabled,
      pageTitle: metadata.title || '',
      metaDescription: metadata.description || '',
      favicon: metadata.favicon || '',
      logo: metadata.logo || '',
      contactPage: (quality.contactPageStatus as 'found' | 'missing' | 'broken') || 'missing',
      aboutPage: (quality.aboutPageStatus as 'found' | 'missing') || 'missing',
      servicesPage: (quality.servicesPageStatus as 'found' | 'missing') || 'missing',
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

export const websiteAuditService = new WebsiteAuditService();
