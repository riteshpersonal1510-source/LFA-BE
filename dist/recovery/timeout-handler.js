"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeoutHandler = void 0;
class TimeoutHandler {
    constructor(defaultTimeout = 60000) {
        this.defaultTimeout = defaultTimeout;
    }
    async withTimeout(fn, timeout, timeoutMessage = 'Operation timed out') {
        let timeoutId;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error(timeoutMessage));
            }, timeout);
        });
        try {
            const result = await Promise.race([fn(), timeoutPromise]);
            if (timeoutId)
                clearTimeout(timeoutId);
            return result;
        }
        catch (error) {
            if (timeoutId)
                clearTimeout(timeoutId);
            throw error;
        }
    }
    async withDefaultTimeout(fn) {
        return this.withTimeout(fn, this.defaultTimeout);
    }
    async navigateWithTimeout(page, url, timeout = 15000) {
        await this.withTimeout(() => page.goto(url, { waitUntil: 'networkidle' }), timeout, `Navigation to ${url} timed out`);
    }
    async extractWithTimeout(extraction, timeout = 10000, operation = 'extraction') {
        return this.withTimeout(extraction, timeout, `${operation} timed out`);
    }
}
exports.TimeoutHandler = TimeoutHandler;
//# sourceMappingURL=timeout-handler.js.map