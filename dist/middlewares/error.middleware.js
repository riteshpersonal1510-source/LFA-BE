"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMiddleware = void 0;
const axios_1 = require("axios");
const logger_1 = require("../utils/logger");
function setCorsHeaders(res) {
    const origin = '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, ngrok-skip-browser-warning, X-Requested-With, X-CSRF-Token, Cache-Control, Pragma');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
}
const errorMiddleware = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }
    setCorsHeaders(res);
    let statusCode = 500;
    let message = 'Internal Server Error';
    let code;
    let details;
    if (err instanceof axios_1.AxiosError) {
        const axiosErr = err;
        if (axiosErr.response?.status) {
            statusCode = axiosErr.response.status;
            message = axiosErr.response.statusText || message;
            const data = axiosErr.response.data;
            if (data?.message)
                message = data.message;
            if (data?.code)
                code = data.code;
            if (data?.detail)
                details = data.detail;
            logger_1.logger.error({
                type: 'AxiosError',
                status: statusCode,
                message,
                code,
                axiosMessage: axiosErr.message,
                path: req.path,
                method: req.method,
            }, '[AxiosError] Request to AI service failed');
        }
        else if (axiosErr.code === 'ECONNREFUSED') {
            statusCode = 503;
            message = 'AI service unavailable';
            code = 'AI_SERVICE_UNAVAILABLE';
            logger_1.logger.error({
                type: 'AxiosConnectionError',
                message: 'Connection refused to AI service',
                path: req.path,
            }, '[AxiosError] Connection refused');
        }
        else {
            statusCode = 500;
            message = 'External service error';
            code = 'EXTERNAL_SERVICE_ERROR';
            logger_1.logger.error({
                type: 'AxiosUnknownError',
                axiosMessage: axiosErr.message,
                path: req.path,
            }, '[AxiosError] Unknown axios error');
        }
    }
    else if (err.statusCode) {
        statusCode = err.statusCode;
        message = err.message || message;
        code = err.code;
        details = err.details;
    }
    else if (err.status) {
        statusCode = err.status;
        message = err.message || message;
    }
    else if (err.isOperational) {
        message = err.message;
        statusCode = err.statusCode || 400;
    }
    logger_1.logger.error({
        statusCode,
        message,
        code,
        path: req.path,
        method: req.method,
        body: req.body ? { keyword: req.body.keyword, location: req.body.location } : undefined,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    }, '[ErrorMiddleware] Returning error response');
    const response = {
        success: false,
        message,
    };
    if (code)
        response.code = code;
    if (details)
        response.details = details;
    if (process.env.NODE_ENV === 'development') {
        response.error = err.message;
        response.stack = err.stack;
    }
    res.status(statusCode).json(response);
};
exports.errorMiddleware = errorMiddleware;
//# sourceMappingURL=error.middleware.js.map