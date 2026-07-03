"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectionEngine = exports.RejectionEngine = void 0;
const DEFAULT_CONFIG = {
    minRelevanceScore: 20,
    minFinalConfidence: 25,
    minLocationConfidence: 10,
    rejectOnNegativeMatch: true,
    rejectWithoutContact: false,
};
class RejectionEngine {
    constructor(config) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    evaluate(params) {
        if (params.negativeMatch && this.config.rejectOnNegativeMatch) {
            return {
                rejected: true,
                reason: 'Business matches negative patterns (unrelated business type)',
                rejectionCode: 'NEGATIVE_MATCH',
            };
        }
        if (params.relevanceScore < this.config.minRelevanceScore) {
            return {
                rejected: true,
                reason: `Relevance score ${params.relevanceScore} is below minimum ${this.config.minRelevanceScore}`,
                rejectionCode: 'IRRELEVANT_BUSINESS',
            };
        }
        if (params.finalConfidence < this.config.minFinalConfidence) {
            return {
                rejected: true,
                reason: `Confidence score ${params.finalConfidence} is below minimum ${this.config.minFinalConfidence}`,
                rejectionCode: 'LOW_CONFIDENCE',
            };
        }
        if (params.locationConfidence < this.config.minLocationConfidence) {
            return {
                rejected: true,
                reason: `Location confidence ${params.locationConfidence} is below minimum ${this.config.minLocationConfidence}`,
                rejectionCode: 'LOW_LOCATION_CONFIDENCE',
            };
        }
        if (this.config.rejectWithoutContact &&
            !params.hasWebsite && !params.hasPhone && !params.hasEmail) {
            return {
                rejected: true,
                reason: 'Lead has no contact information (website, phone, or email)',
                rejectionCode: 'NO_CONTACT_INFO',
            };
        }
        if (params.ambiguityWarnings && params.ambiguityWarnings.length > 0 &&
            params.categoryConfidence < 30) {
            return {
                rejected: true,
                reason: `Ambiguous category with low confidence: ${params.ambiguityWarnings.join('; ')}`,
                rejectionCode: 'AMBIGUOUS_CATEGORY',
            };
        }
        return {
            rejected: false,
            reason: undefined,
            rejectionCode: 'NOT_REJECTED',
        };
    }
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
    getConfig() {
        return { ...this.config };
    }
}
exports.RejectionEngine = RejectionEngine;
exports.rejectionEngine = new RejectionEngine();
//# sourceMappingURL=rejection-engine.js.map