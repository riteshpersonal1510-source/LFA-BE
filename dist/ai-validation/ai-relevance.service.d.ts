import { type SemanticValidationResult } from './semantic-validator';
import { type ClassificationResult } from './business-classifier';
import { type LocationValidationResult } from './location-validator';
import { type ConfidenceResult } from './confidence-engine';
import { type RejectionResult } from './rejection-engine';
import { type LeadQualityResult } from './lead-quality-engine';
export interface AIValidationInput {
    companyName: string;
    category?: string;
    businessType: string;
    address?: string;
    website?: string;
    phone?: string;
    email?: string;
    rating?: number;
    source: string;
    targetArea?: string;
    targetCity?: string;
    targetState?: string;
}
export interface AIValidationOutput {
    semanticValidation: SemanticValidationResult;
    classification: ClassificationResult;
    locationValidation: LocationValidationResult;
    confidence: ConfidenceResult;
    rejection: RejectionResult;
    quality: LeadQualityResult;
}
export declare class AIRelevanceService {
    validate(input: AIValidationInput): AIValidationOutput;
    validateBatch(inputs: AIValidationInput[]): AIValidationOutput[];
    getKeywordIntelligence(): import("./keyword-intelligence").KeywordIntelligence;
    getSemanticValidator(): import("./semantic-validator").SemanticValidator;
}
export declare const aiRelevanceService: AIRelevanceService;
//# sourceMappingURL=ai-relevance.service.d.ts.map