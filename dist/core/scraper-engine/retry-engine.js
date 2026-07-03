"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_RETRY_CONFIG_OBJ = exports.RetryEngine = void 0;
const logger_1 = require("../../utils/logger");
const types_1 = require("./types");
class RetryEngine {
    constructor(config = {}) {
        this.config = { ...types_1.DEFAULT_RETRY_CONFIG, ...config };
    }
    async execute(fn, context) {
        let lastError = null;
        for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
            try {
                const result = await fn();
                if (attempt > 0) {
                    logger_1.logger.info({
                        source: context.source,
                        keyword: context.keyword,
                        attempt: attempt + 1,
                    }, 'RetryEngine: Succeeded on retry');
                }
                return { success: true, data: result, error: null, retriesUsed: attempt };
            }
            catch (error) {
                lastError = error instanceof Error ? error.message : String(error);
                if (!this.shouldRetry(lastError)) {
                    logger_1.logger.info({
                        source: context.source,
                        keyword: context.keyword,
                        error: lastError,
                        attempt: attempt + 1,
                    }, 'RetryEngine: Non-retryable error, stopping');
                    break;
                }
                if (attempt < this.config.maxRetries) {
                    const delay = this.calculateDelay(attempt);
                    logger_1.logger.warn({
                        source: context.source,
                        keyword: context.keyword,
                        error: lastError,
                        attempt: attempt + 1,
                        nextRetryInMs: delay,
                    }, 'RetryEngine: Will retry');
                    await this.sleep(delay);
                }
            }
        }
        return { success: false, data: null, error: lastError, retriesUsed: this.config.maxRetries };
    }
    shouldRetry(error) {
        const lower = error.toLowerCase();
        const isNonRetryable = types_1.NON_RETRYABLE_ERRORS.some(nr => lower.includes(nr));
        return !isNonRetryable;
    }
    calculateDelay(attempt) {
        const delay = this.config.baseDelayMs * Math.pow(this.config.backoffFactor, attempt);
        return Math.min(delay, this.config.maxDelayMs);
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.RetryEngine = RetryEngine;
exports.DEFAULT_RETRY_CONFIG_OBJ = { ...types_1.DEFAULT_RETRY_CONFIG };
//# sourceMappingURL=retry-engine.js.map