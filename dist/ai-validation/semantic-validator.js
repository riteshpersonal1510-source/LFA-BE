"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.semanticValidator = exports.SemanticValidator = void 0;
const keyword_intelligence_1 = require("./keyword-intelligence");
class SemanticValidator {
    validate(companyName, category, businessType) {
        const group = keyword_intelligence_1.keywordIntelligence.getGroup(businessType);
        if (!group) {
            return this.fallback(companyName, category, businessType);
        }
        const result = keyword_intelligence_1.keywordIntelligence.matchAgainstGroup(companyName, category, businessType);
        const lowerName = companyName.toLowerCase().trim();
        const lowerCategory = (category || '').toLowerCase().trim();
        let matchType = 'none';
        if (lowerName.includes(group.primary) || lowerCategory.includes(group.primary)) {
            matchType = 'exact';
        }
        else {
            for (const alias of group.aliases) {
                if (lowerName.includes(alias) || lowerCategory.includes(alias)) {
                    matchType = 'alias';
                    break;
                }
            }
        }
        if (matchType === 'none') {
            for (const term of group.relatedTerms) {
                if (keyword_intelligence_1.keywordIntelligence['fuzzyMatch'](lowerName, term) ||
                    (lowerCategory && keyword_intelligence_1.keywordIntelligence['fuzzyMatch'](lowerCategory, term))) {
                    matchType = 'related';
                    break;
                }
            }
        }
        if (matchType === 'none' && result.matched) {
            matchType = 'fuzzy';
        }
        const categoryConfidence = this.calculateCategoryConfidence(result.score, matchType, result.matchedTerms.length, result.negativeMatch);
        return {
            relevant: result.matched && !result.negativeMatch,
            score: result.score,
            categoryConfidence,
            matchedKeywords: result.matchedTerms,
            validatedCategory: result.matchedCategory,
            matchType,
            negativeMatch: result.negativeMatch,
            matchedGroup: group.primary,
        };
    }
    calculateCategoryConfidence(score, matchType, _matchedCount, negativeMatch) {
        if (negativeMatch)
            return 0;
        if (matchType === 'exact')
            return Math.min(100, score + 15);
        if (matchType === 'alias')
            return Math.min(100, score + 10);
        if (matchType === 'related')
            return Math.min(100, score + 5);
        if (matchType === 'fuzzy')
            return Math.min(85, score);
        return Math.min(50, score);
    }
    fallback(companyName, category, businessType) {
        const lowerName = companyName.toLowerCase().trim();
        const lowerCategory = (category || '').toLowerCase().trim();
        const businessLower = businessType.toLowerCase().trim();
        const matchedKeywords = [];
        let score = 0;
        if (lowerName.includes(businessLower)) {
            score += 35;
            matchedKeywords.push(businessLower);
        }
        if (lowerCategory.includes(businessLower)) {
            score += 25;
            matchedKeywords.push(`${businessLower}(cat)`);
        }
        const businessWords = businessLower.split(/\s+/);
        for (const word of businessWords) {
            if (word.length < 3)
                continue;
            if (lowerName.includes(word)) {
                score += 10;
                matchedKeywords.push(word);
            }
            if (lowerCategory.includes(word)) {
                score += 8;
                if (!matchedKeywords.includes(word))
                    matchedKeywords.push(word);
            }
        }
        const matchType = lowerName.includes(businessLower) ? 'exact' :
            matchedKeywords.length > 0 ? 'fuzzy' : 'none';
        return {
            relevant: score >= 20,
            score: Math.min(100, Math.max(0, score)),
            categoryConfidence: score >= 60 ? 85 : score >= 40 ? 65 : score >= 20 ? 40 : 10,
            matchedKeywords: [...new Set(matchedKeywords)],
            validatedCategory: matchedKeywords.length > 0 ? matchedKeywords[0] : (category || companyName),
            matchType,
            negativeMatch: false,
            matchedGroup: null,
        };
    }
}
exports.SemanticValidator = SemanticValidator;
exports.semanticValidator = new SemanticValidator();
//# sourceMappingURL=semantic-validator.js.map