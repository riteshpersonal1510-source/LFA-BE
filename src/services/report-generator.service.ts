export interface ReportResult {
  businessSummary: {
    companyName: string;
    category: string;
    location: string;
    rating: number;
    reviewsCount: number;
    businessStatus: string;
  };
  websiteStatus: {
    exists: boolean;
    reachable: boolean;
    url: string;
    cms: string;
    https: boolean;
  };
  responsiveAudit: Record<string, unknown>;
  seoSummary: {
    score: number;
    issues: string[];
    title: string;
    description: string;
  };
  performanceSummary: {
    score: number;
    loadTimeMs: number;
    issues: string[];
  };
  missingFeatures: string[];
  improvementRecommendations: string[];
  leadScore: number;
  priority: 'high' | 'medium' | 'low';
  recommendedServices: string[];
  websiteOpportunity: {
    level: string;
    explanation: string;
  };
  generatedAt: string;
}

export interface ReportData {
  companyName?: string;
  category?: string;
  city?: string;
  state?: string;
  rating?: number;
  reviewsCount?: number;
  businessStatus?: string;
  website?: string;
  websiteReachable?: boolean;
  websiteMetadata?: { cms?: string; httpsEnabled?: boolean };
  responsiveAudit?: Record<string, unknown>;
  responsiveScore?: number;
  seoAudit?: { score?: number; issues?: string[]; title?: string; description?: string };
  performanceAudit?: { score?: number; loadTimeMs?: number; issues?: string[] };
  websiteQuality?: { issues?: string[] };
  leadScore?: number;
  priority?: string;
  websiteOpportunity?: { opportunity?: string; explanation?: string; recommendedServices?: string[] };
}

export class ReportGeneratorService {
  generate(data: ReportData): ReportResult {
    const missingFeatures: string[] = [];
    if (!data.website || !data.websiteReachable) missingFeatures.push('No functional website');
    if (!data.seoAudit || (data.seoAudit.score || 0) < 40) missingFeatures.push('Poor SEO optimization');
    if (!data.responsiveAudit || (data.responsiveScore || 0) < 40) missingFeatures.push('Not mobile responsive');
    if (!data.performanceAudit || (data.performanceAudit.score || 0) < 40) missingFeatures.push('Slow performance');

    const improvementRecommendations: string[] = [];
    if (data.websiteQuality?.issues) {
      for (const issue of data.websiteQuality.issues) {
        improvementRecommendations.push(`Fix: ${issue}`);
      }
    }
    if (data.seoAudit?.issues) {
      for (const issue of data.seoAudit.issues) {
        improvementRecommendations.push(`Improve: ${issue}`);
      }
    }
    if (data.performanceAudit?.issues) {
      for (const issue of data.performanceAudit.issues) {
        improvementRecommendations.push(`Optimize: ${issue}`);
      }
    }
    if (!data.website || !data.websiteReachable) {
      improvementRecommendations.push('Build a professional website');
    }

    const priority = (data.priority as 'high' | 'medium' | 'low') || 'medium';
    const opp = data.websiteOpportunity;

    return {
      businessSummary: {
        companyName: data.companyName || '',
        category: data.category || '',
        location: [data.city, data.state].filter(Boolean).join(', '),
        rating: data.rating || 0,
        reviewsCount: data.reviewsCount || 0,
        businessStatus: data.businessStatus || '',
      },
      websiteStatus: {
        exists: !!data.website,
        reachable: !!data.websiteReachable,
        url: data.website || '',
        cms: data.websiteMetadata?.cms || '',
        https: !!data.websiteMetadata?.httpsEnabled,
      },
      responsiveAudit: data.responsiveAudit || {},
      seoSummary: {
        score: data.seoAudit?.score || 0,
        issues: data.seoAudit?.issues || [],
        title: data.seoAudit?.title || '',
        description: data.seoAudit?.description || '',
      },
      performanceSummary: {
        score: data.performanceAudit?.score || 0,
        loadTimeMs: data.performanceAudit?.loadTimeMs || 0,
        issues: data.performanceAudit?.issues || [],
      },
      missingFeatures,
      improvementRecommendations,
      leadScore: data.leadScore || 0,
      priority,
      recommendedServices: opp?.recommendedServices || [],
      websiteOpportunity: {
        level: opp?.opportunity || 'low',
        explanation: opp?.explanation || '',
      },
      generatedAt: new Date().toISOString(),
    };
  }
}

export const reportGeneratorService = new ReportGeneratorService();
