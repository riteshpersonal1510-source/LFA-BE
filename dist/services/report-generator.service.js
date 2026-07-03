"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportGeneratorService = exports.ReportGeneratorService = void 0;
class ReportGeneratorService {
    generate(data) {
        const missingFeatures = [];
        if (!data.website || !data.websiteReachable)
            missingFeatures.push('No functional website');
        if (!data.seoAudit || (data.seoAudit.score || 0) < 40)
            missingFeatures.push('Poor SEO optimization');
        if (!data.responsiveAudit || (data.responsiveScore || 0) < 40)
            missingFeatures.push('Not mobile responsive');
        if (!data.performanceAudit || (data.performanceAudit.score || 0) < 40)
            missingFeatures.push('Slow performance');
        const improvementRecommendations = [];
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
        const priority = data.priority || 'medium';
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
exports.ReportGeneratorService = ReportGeneratorService;
exports.reportGeneratorService = new ReportGeneratorService();
//# sourceMappingURL=report-generator.service.js.map