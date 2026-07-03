"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.revenuePredictor = exports.RevenuePredictor = void 0;
const logger_1 = require("../utils/logger");
class RevenuePredictor {
    predict(input) {
        try {
            let score = 0;
            if (input.rating >= 4)
                score += 15;
            else if (input.rating >= 3)
                score += 8;
            if (input.reviewsCount > 100)
                score += 20;
            else if (input.reviewsCount > 50)
                score += 15;
            else if (input.reviewsCount > 10)
                score += 8;
            else if (input.reviewsCount > 0)
                score += 3;
            if (input.websiteQualityScore >= 80)
                score += 15;
            else if (input.websiteQualityScore >= 60)
                score += 8;
            if (input.socialPresenceScore >= 70)
                score += 10;
            else if (input.socialPresenceScore >= 40)
                score += 5;
            if (input.leadScore >= 80)
                score += 20;
            else if (input.leadScore >= 60)
                score += 10;
            else if (input.leadScore >= 40)
                score += 5;
            const highValueCategories = ['real estate', 'hospitality', 'automotive', 'healthcare', 'education', 'technology', 'legal', 'financial'];
            if (input.category && highValueCategories.some(c => input.category?.toLowerCase().includes(c))) {
                score += 10;
            }
            if (input.area && (input.area.toLowerCase().includes('sector') || input.area.match(/\d+/))) {
                score += 5;
            }
            let result;
            if (score >= 80)
                result = 'enterprise';
            else if (score >= 50)
                result = 'high';
            else if (score >= 25)
                result = 'medium';
            else
                result = 'low';
            logger_1.logger.info(`Revenue potential: ${result} (score: ${score})`);
            return result;
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to predict revenue:');
            return 'low';
        }
    }
}
exports.RevenuePredictor = RevenuePredictor;
exports.revenuePredictor = new RevenuePredictor();
//# sourceMappingURL=revenue-predictor.js.map