"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUALIFICATION_RULES = exports.SEO_SCORE_WEIGHTS = exports.RESPONSE_TIME_THRESHOLDS = exports.SSL_THRESHOLD_DAYS = exports.QUALIFICATION_LEVELS = exports.WEBSITE_STATUSES = void 0;
exports.WEBSITE_STATUSES = ['unknown', 'no-website', 'broken-website', 'outdated-website', 'average-website', 'modern-website'];
exports.QUALIFICATION_LEVELS = ['high-potential', 'medium-potential', 'low-potential'];
exports.SSL_THRESHOLD_DAYS = 90;
exports.RESPONSE_TIME_THRESHOLDS = {
    excellent: 1000,
    good: 2000,
    acceptable: 3000,
    slow: 5000,
};
exports.SEO_SCORE_WEIGHTS = {
    metaTitle: 20,
    metaDescription: 15,
    mobileFriendly: 20,
    hasContactPage: 25,
    hasSocialLinks: 20,
};
exports.QUALIFICATION_RULES = {
    highPotential: {
        minScore: 80,
        requires: ['sslEnabled', 'hasContactPage'],
    },
    mediumPotential: {
        minScore: 50,
        requires: [],
    },
    lowPotential: {
        minScore: 0,
        requires: [],
    },
};
//# sourceMappingURL=analysis.js.map