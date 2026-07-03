"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadScoringService = exports.LeadScoringService = void 0;
class LeadScoringService {
    calculate(data) {
        const reasoning = [];
        let websitePresence = 0;
        if (data.hasWebsite && data.websiteReachable) {
            websitePresence = 20;
            reasoning.push('Working website present');
        }
        else if (data.hasWebsite) {
            websitePresence = 10;
            reasoning.push('Website present but unreachable');
        }
        else {
            reasoning.push('No website — significant opportunity');
        }
        let contactInfo = 0;
        if (data.email && data.phone) {
            contactInfo = 20;
            reasoning.push('Both email and phone available');
        }
        else if (data.email || data.phone) {
            contactInfo = 10;
            reasoning.push(data.email ? 'Email available' : 'Phone available');
        }
        else {
            reasoning.push('No contact information found');
        }
        let responsiveScore = 0;
        if (data.responsiveScore !== undefined) {
            responsiveScore = Math.round(data.responsiveScore / 5);
            if (data.responsiveScore >= 70)
                reasoning.push('Good responsive design');
            else if (data.responsiveScore >= 40)
                reasoning.push('Average responsive design');
            else
                reasoning.push('Poor responsive design');
        }
        else {
            reasoning.push('Responsive audit not available');
        }
        let seoScore = 0;
        if (data.seoScore !== undefined) {
            seoScore = Math.round(data.seoScore / 5);
            if (data.seoScore >= 70)
                reasoning.push('Good SEO');
            else if (data.seoScore >= 40)
                reasoning.push('Average SEO — improvement needed');
            else
                reasoning.push('Poor SEO — significant opportunity');
        }
        let socialPresence = 0;
        if (data.socialLinks) {
            const platformCount = Object.values(data.socialLinks).filter(Boolean).length;
            socialPresence = Math.min(platformCount * 5, 15);
            if (platformCount > 0)
                reasoning.push(`${platformCount} social platforms detected`);
            else
                reasoning.push('No social media presence');
        }
        let businessStrength = 0;
        if (data.rating) {
            if (data.rating >= 4.5) {
                businessStrength += 8;
                reasoning.push('Excellent rating');
            }
            else if (data.rating >= 4.0) {
                businessStrength += 5;
                reasoning.push('Good rating');
            }
            else {
                businessStrength += 2;
            }
        }
        if (data.reviewsCount && data.reviewsCount > 50) {
            businessStrength += 5;
            reasoning.push('Strong review count');
        }
        else if (data.reviewsCount && data.reviewsCount > 10) {
            businessStrength += 2;
        }
        if (data.businessStatus && data.businessStatus.toLowerCase().includes('open')) {
            businessStrength += 2;
        }
        let websiteQuality = 0;
        if (data.websiteQuality?.score !== undefined) {
            websiteQuality = Math.round(data.websiteQuality.score / 10);
        }
        const totalScore = Math.min(100, websitePresence + contactInfo + responsiveScore + seoScore + socialPresence + businessStrength + websiteQuality);
        let priority;
        if (totalScore >= 70) {
            priority = 'high';
            reasoning.push(`Overall score ${totalScore}/100 — high priority lead`);
        }
        else if (totalScore >= 40) {
            priority = 'medium';
            reasoning.push(`Overall score ${totalScore}/100 — medium priority lead`);
        }
        else {
            priority = 'low';
            reasoning.push(`Overall score ${totalScore}/100 — low priority lead`);
        }
        return {
            score: totalScore,
            priority,
            reasoning,
            breakdown: {
                websitePresence,
                contactInfo,
                responsiveScore,
                seoScore,
                socialPresence,
                businessStrength,
                websiteQuality,
            },
        };
    }
}
exports.LeadScoringService = LeadScoringService;
exports.leadScoringService = new LeadScoringService();
//# sourceMappingURL=lead-scoring.service.js.map