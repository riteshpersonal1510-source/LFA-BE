"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiRelevanceService = exports.AIRelevanceService = void 0;
const semantic_validator_1 = require("./semantic-validator");
const business_classifier_1 = require("./business-classifier");
const location_validator_1 = require("./location-validator");
const confidence_engine_1 = require("./confidence-engine");
const rejection_engine_1 = require("./rejection-engine");
const lead_quality_engine_1 = require("./lead-quality-engine");
const keyword_intelligence_1 = require("./keyword-intelligence");
class AIRelevanceService {
    validate(input) {
        const semantic = semantic_validator_1.semanticValidator.validate(input.companyName, input.category, input.businessType);
        const classification = business_classifier_1.businessClassifier.classify(input.companyName, input.category, input.businessType);
        const location = location_validator_1.locationValidator.validate(input.address, input.targetArea, input.targetCity, input.targetState);
        const sourceTrustScore = confidence_engine_1.confidenceEngine.getSourceTrustScore(input.source);
        const confidence = confidence_engine_1.confidenceEngine.calculate({
            relevanceScore: semantic.score,
            categoryConfidence: semantic.categoryConfidence,
            locationConfidence: location.locationConfidence,
            sourceTrustScore,
            hasWebsite: !!input.website,
            hasPhone: !!input.phone,
            hasEmail: !!input.email,
            ratingScore: input.rating ? (input.rating / 5) * 100 : 0,
            negativeMatch: semantic.negativeMatch,
            matchType: semantic.matchType,
        }, input.source);
        const rejection = rejection_engine_1.rejectionEngine.evaluate({
            relevanceScore: semantic.score,
            finalConfidence: confidence.finalConfidence,
            locationConfidence: location.locationConfidence,
            categoryConfidence: semantic.categoryConfidence,
            negativeMatch: semantic.negativeMatch,
            hasWebsite: !!input.website,
            hasPhone: !!input.phone,
            hasEmail: !!input.email,
            ambiguityWarnings: classification.ambiguityWarnings,
        });
        const quality = lead_quality_engine_1.leadQualityEngine.assess({
            semantic,
            classification,
            location,
            confidence,
            rejection,
        });
        return {
            semanticValidation: semantic,
            classification,
            locationValidation: location,
            confidence,
            rejection,
            quality,
        };
    }
    validateBatch(inputs) {
        return inputs.map(input => this.validate(input));
    }
    getKeywordIntelligence() {
        return keyword_intelligence_1.keywordIntelligence;
    }
    getSemanticValidator() {
        return semantic_validator_1.semanticValidator;
    }
}
exports.AIRelevanceService = AIRelevanceService;
exports.aiRelevanceService = new AIRelevanceService();
//# sourceMappingURL=ai-relevance.service.js.map