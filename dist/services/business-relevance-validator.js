"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.businessRelevanceValidator = exports.BusinessRelevanceValidator = void 0;
const ai_relevance_service_1 = require("../ai-validation/ai-relevance.service");
class BusinessRelevanceValidator {
    validate(companyName, category, businessType) {
        return ai_relevance_service_1.aiRelevanceService.getSemanticValidator().validate(companyName, category, businessType);
    }
    validateLocation(address, targetArea, targetCity, targetState) {
        const result = ai_relevance_service_1.aiRelevanceService.validate({
            companyName: '',
            businessType: '',
            address,
            targetArea,
            targetCity,
            targetState,
            source: '',
        }).locationValidation;
        return { relevant: result.relevant, score: result.locationConfidence };
    }
    validateWithAI(companyName, category, businessType, address, website, phone, email, rating, source, targetArea, targetCity, targetState) {
        const output = ai_relevance_service_1.aiRelevanceService.validate({
            companyName,
            category,
            businessType,
            address,
            website,
            phone,
            email,
            rating,
            source: source || '',
            targetArea,
            targetCity,
            targetState,
        });
        let validationStatus;
        if (output.rejection.rejected) {
            validationStatus = 'rejected';
        }
        else if (output.quality.recommendation === 'review') {
            validationStatus = 'needs-review';
        }
        else {
            validationStatus = 'validated';
        }
        return {
            relevant: !output.rejection.rejected,
            relevanceScore: output.semanticValidation.score,
            categoryConfidence: output.semanticValidation.categoryConfidence,
            locationConfidence: output.locationValidation.locationConfidence,
            finalConfidence: output.confidence.finalConfidence,
            validationStatus,
            rejectionReason: output.rejection.reason,
            quality: output.quality.overall.quality,
            matchedKeywords: output.semanticValidation.matchedKeywords,
            validatedCategory: output.semanticValidation.validatedCategory,
            matchType: output.semanticValidation.matchType,
            warnings: output.quality.warnings,
        };
    }
}
exports.BusinessRelevanceValidator = BusinessRelevanceValidator;
exports.businessRelevanceValidator = new BusinessRelevanceValidator();
//# sourceMappingURL=business-relevance-validator.js.map