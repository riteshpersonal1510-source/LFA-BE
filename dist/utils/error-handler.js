"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFound = exports.asyncHandler = exports.errorHandler = exports.AppError = void 0;
const logger_1 = require("../utils/logger");
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
const errorHandler = (err, req, res, next) => {
    logger_1.logger.error({
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });
    if (res.headersSent) {
        return next(err);
    }
    const statusCode = err.statusCode || 500;
    const message = err.isOperational
        ? err.message
        : 'Internal Server Error';
    res.status(statusCode).json({
        success: false,
        message,
        error: process.env.NODE_ENV === 'development' ? { stack: err.stack, code: err.code } : message,
    });
};
exports.errorHandler = errorHandler;
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => next(err));
};
exports.asyncHandler = asyncHandler;
const notFound = (req, _res, next) => {
    next(new AppError(`Route ${req.method} ${req.path} not found`, 404));
};
exports.notFound = notFound;
//# sourceMappingURL=error-handler.js.map