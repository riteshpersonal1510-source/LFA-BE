"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.opportunityClassifier = exports.OpportunityClassifier = void 0;
const logger_1 = require("../utils/logger");
class OpportunityClassifier {
    classify(input) {
        try {
            let score = 0;
            const highValue = ['high', 'enterprise'];
            const mediumValue = ['medium'];
            if (highValue.includes(input.redesignPotential))
                score += 20;
            else if (mediumValue.includes(input.redesignPotential))
                score += 10;
            if (highValue.includes(input.seoOpportunity))
                score += 15;
            else if (mediumValue.includes(input.seoOpportunity))
                score += 8;
            if (highValue.includes(input.digitalMarketingOpportunity))
                score += 15;
            else if (mediumValue.includes(input.digitalMarketingOpportunity))
                score += 8;
            if (input.conversionProbability === 'high')
                score += 20;
            else if (input.conversionProbability === 'medium')
                score += 10;
            if (highValue.includes(input.revenuePotential))
                score += 20;
            else if (mediumValue.includes(input.revenuePotential))
                score += 10;
            let result;
            if (score >= 60)
                result = 'high';
            else if (score >= 30)
                result = 'medium';
            else
                result = 'low';
            logger_1.logger.info(`Opportunity classified: ${result} (score: ${score})`);
            return result;
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to classify opportunity:');
            return 'low';
        }
    }
}
exports.OpportunityClassifier = OpportunityClassifier;
exports.opportunityClassifier = new OpportunityClassifier();
//# sourceMappingURL=opportunity-classifier.js.map