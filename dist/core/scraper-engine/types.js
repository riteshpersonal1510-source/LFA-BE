"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_CONCURRENCY = exports.NON_RETRYABLE_ERRORS = exports.DEFAULT_RETRY_CONFIG = void 0;
exports.DEFAULT_RETRY_CONFIG = {
    maxRetries: 2,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    backoffFactor: 2,
};
exports.NON_RETRYABLE_ERRORS = [
    'invalid query',
    'invalid keyword',
    'invalid location',
    'empty keyword',
    'empty location',
    'bad request',
    'invalid source',
    'validation failed',
    'no results found',
    'invalid selector',
];
exports.MAX_CONCURRENCY = {
    'google-maps': 2,
    'justdial': 2,
    'indiamart': 1,
};
//# sourceMappingURL=types.js.map