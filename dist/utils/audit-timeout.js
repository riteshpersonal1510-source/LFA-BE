"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withTimeout = withTimeout;
const logger_1 = require("./logger");
function withTimeout(promise, timeoutMs, label) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            const err = new Error(`${label} timed out after ${timeoutMs}ms`);
            logger_1.logger.warn({ timeoutMs, label }, err.message);
            reject(err);
        }, timeoutMs);
        promise
            .then((result) => {
            clearTimeout(timer);
            resolve(result);
        })
            .catch((err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}
//# sourceMappingURL=audit-timeout.js.map