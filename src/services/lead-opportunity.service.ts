export interface OpportunityResult {
  websiteExists: boolean;
  websiteMissing: boolean;
  websiteOutdated: boolean;
  noMobileOptimization: boolean;
  missingContactInfo: boolean;
  missingSeo: boolean;
  missingSocialPresence: boolean;
  noSsl: boolean;
  opportunity: 'high' | 'medium' | 'low';
  explanation: string;
  recommendedServices: string[];
}

export interface OpportunityData {
  hasWebsite?: boolean;
  websiteReachable?: boolean;
  websiteMetadata?: { httpsEnabled?: boolean; cms?: string };
  seoAudit?: { score?: number };
  responsiveScore?: number;
  phones?: string[];
  email?: string;
  socialLinks?: Record<string, unknown>;
  websiteQuality?: { sslEnabled?: boolean; score?: number; issues?: string[] };
}

export class LeadOpportunityService {
  analyze(data: OpportunityData): OpportunityResult {
    const websiteExists = !!(data.hasWebsite && data.websiteReachable);
    const websiteMissing = !data.hasWebsite;
    const noSsl = websiteExists && data.websiteMetadata?.httpsEnabled === false;
    const noMobileOptimization = websiteExists && (data.responsiveScore === undefined || data.responsiveScore < 40);
    const missingContactInfo = !data.email && (!data.phones || data.phones.length === 0);
    const missingSeo = websiteExists && (data.seoAudit === undefined || (data.seoAudit.score || 0) < 40);
    const missingSocialPresence = !data.socialLinks || Object.values(data.socialLinks).filter(Boolean).length === 0;
    const websiteOutdated = websiteExists && (data.websiteQuality?.score || 0) < 50;

    const issues: string[] = [];
    if (websiteMissing) issues.push('No website exists');
    if (websiteOutdated) issues.push('Website is outdated');
    if (noMobileOptimization) issues.push('Not mobile optimized');
    if (missingContactInfo) issues.push('Missing contact information');
    if (missingSeo) issues.push('Poor SEO');
    if (missingSocialPresence) issues.push('No social media presence');
    if (noSsl) issues.push('No SSL certificate');

    const issueCount = issues.length;
    let opportunity: 'high' | 'medium' | 'low';
    let explanation: string;
    const recommendedServices: string[] = [];

    if (websiteMissing) {
      opportunity = 'high';
      explanation = 'Business has no website — significant opportunity for website development';
      recommendedServices.push('Website Development');
    } else if (issueCount >= 3) {
      opportunity = 'high';
      explanation = `Business website has ${issueCount} critical issues: ${issues.slice(0, 3).join(', ')}`;
      recommendedServices.push('Website Redesign');
      if (noSsl) recommendedServices.push('SSL Certificate Setup');
      if (noMobileOptimization) recommendedServices.push('Mobile Optimization');
      if (missingSeo) recommendedServices.push('SEO Services');
    } else if (issueCount >= 1) {
      opportunity = 'medium';
      explanation = `Business website needs improvement: ${issues.join(', ')}`;
      if (noMobileOptimization) recommendedServices.push('Responsive Design');
      if (missingContactInfo) recommendedServices.push('Contact Form Integration');
      if (missingSocialPresence) recommendedServices.push('Social Media Integration');
    } else {
      opportunity = 'low';
      explanation = 'Business website is in good condition — minimal opportunity';
      recommendedServices.push('Website Maintenance');
    }

    if (missingSocialPresence && !recommendedServices.includes('Social Media Integration')) {
      recommendedServices.push('Social Media Setup');
    }

    return {
      websiteExists, websiteMissing, websiteOutdated,
      noMobileOptimization, missingContactInfo, missingSeo,
      missingSocialPresence, noSsl,
      opportunity, explanation, recommendedServices,
    };
  }
}

export const leadOpportunityService = new LeadOpportunityService();
