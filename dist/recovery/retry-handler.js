"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryHandler = void 0;
const logger_1 = require("../utils/logger");
class RetryHandler {
    constructor(maxRetries = 3) {
        this.retryCount = 0;
        this.config = {
            maxRetries,
            baseDelay: 1000,
            maxDelay: 10000,
            exponential: true,
        };
    }
    async withRetry(fn, config) {
        const finalConfig = { ...this.config, ...config };
        let lastError;
        for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    const delay = this.calculateDelay(attempt, finalConfig);
                    logger_1.logger.info(`RetryHandler: Attempt ${attempt}/${finalConfig.maxRetries}, waiting ${delay}ms`);
                    await this.sleep(delay);
                }
                const result = await fn();
                this.retryCount = 0;
                return result;
            }
            catch (error) {
                lastError = error;
                this.retryCount++;
                logger_1.logger.warn(`RetryHandler: Attempt ${attempt} failed:`, error.message);
                if (!this.shouldRetry(error)) {
                    throw error;
                }
            }
        }
        const err = new Error(`RetryHandler: All ${finalConfig.maxRetries + 1} attempts failed`);
        if (lastError) {
            err.message += `: ${lastError.message}`;
        }
        throw err;
    }
    calculateDelay(attempt, config) {
        const delay = config.baseDelay * Math.pow(2, attempt);
        return Math.min(delay, config.maxDelay);
    }
    shouldRetry(error) {
        if (error.message?.includes('Invalid'))
            return false;
        if (error.message?.includes('401') || error.message?.includes('403'))
            return false;
        return true;
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    getRetryCount() {
        return this.retryCount;
    }
    getQueueLength() {
        return 0;
    }
    reset() {
        this.retryCount = 0;
    }
}
exports.RetryHandler = RetryHandler;
//# sourceMappingURL=retry-handler.js.map