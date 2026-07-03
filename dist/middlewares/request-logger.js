"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = void 0;
const logger_1 = require("../utils/logger");
const requestLogger = (req, res, next) => {
    const requestStart = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - requestStart;
        if (duration > 1000) {
            logger_1.logger.warn({ method: req.method, path: req.path, status: res.statusCode, duration: `${duration}ms` }, 'Slow request');
        }
    });
    next();
};
exports.requestLogger = requestLogger;
//# sourceMappingURL=request-logger.js.map