"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validationErrorHandler = void 0;
const zod_1 = require("zod");
const logger_1 = require("../utils/logger");
const validationErrorHandler = (err, req, res, next) => {
    if (err instanceof zod_1.ZodError) {
        logger_1.logger.warn(`[validation] Validation failed for ${req.method} ${req.path}: ${JSON.stringify(err.errors)}`);
        res.status(400).json({
            success: false,
            message: 'Validation failed',
            error: err.errors.map((e) => ({
                path: e.path.join('.'),
                message: e.message,
            })),
        });
        return;
    }
    next(err);
};
exports.validationErrorHandler = validationErrorHandler;
//# sourceMappingURL=validation.middleware.js.map