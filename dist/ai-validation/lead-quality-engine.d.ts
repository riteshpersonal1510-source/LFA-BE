import type { SemanticValidationResult } from './semantic-validator';
import type { ClassificationResult } from './business-classifier';
import type { LocationValidationResult } from './location-validator';
import type { ConfidenceResult } from './confidence-engine';
import type { RejectionResult } from './rejection-engine';
export interface LeadQualityResult {
    overall: {
        quality: 'excellent' | 'good' | 'average' | 'poor';
        score: number;
        isQualified: boolean;
    };
    semanticValidation: SemanticValidationResult;
    classification: ClassificationResult;
    locationValidation: LocationValidationResult;
    confidence: ConfidenceResult;
    rejection: RejectionResult;
    recommendation: 'accept' | 'review' | 'reject';
    warnings: string[];
}
export declare class LeadQualityEngine {
    assess(params: {
        semantic: SemanticValidationResult;
        classification: ClassificationResult;
        location: LocationValidationResult;
        confidence: ConfidenceResult;
        rejection: RejectionResult;
    }): LeadQualityResult;
}
export declare const leadQualityEngine: LeadQualityEngine;
//# sourceMappingURL=lead-quality-engine.d.ts.map