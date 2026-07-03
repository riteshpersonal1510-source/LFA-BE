"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestTimeout = void 0;
const logger_1 = require("../utils/logger");
const requestTimeout = (timeoutMs = 120000) => {
    return (req, res, next) => {
        const timer = setTimeout(() => {
            logger_1.logger.warn({ path: req.path, method: req.method, timeoutMs }, 'Request timeout');
            if (!res.headersSent) {
                res.status(503).json({
                    success: false,
                    message: 'Request timed out. Please try again.',
                });
            }
        }, timeoutMs);
        res.on('finish', () => {
            clearTimeout(timer);
        });
        next();
    };
};
exports.requestTimeout = requestTimeout;
//# sourceMappingURL=timeout.middleware.js.map