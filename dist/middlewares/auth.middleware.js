"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = require("jsonwebtoken");
const api_error_1 = require("../utils/api-error");
function getJwtSecret() {
    return process.env.JWT_SECRET || 'fallback-secret-do-not-use';
}
function extractToken(req) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.split(' ')[1];
    }
    if (req.cookies && req.cookies.accessToken) {
        return req.cookies.accessToken;
    }
    return null;
}
const authenticate = (req, _res, next) => {
    try {
        const token = extractToken(req);
        if (!token) {
            next(new api_error_1.APIError('Authentication required', 401));
            return;
        }
        const decoded = (0, jsonwebtoken_1.verify)(token, getJwtSecret());
        if (!decoded.userId || decoded.role !== 'admin') {
            next(new api_error_1.APIError('Invalid token', 401));
            return;
        }
        req.user = {
            id: decoded.userId,
            role: 'admin',
        };
        next();
    }
    catch (error) {
        if (error.name === 'TokenExpiredError') {
            next(new api_error_1.APIError('Session expired. Please login again.', 401));
            return;
        }
        if (error.name === 'JsonWebTokenError') {
            next(new api_error_1.APIError('Invalid token', 401));
            return;
        }
        next(new api_error_1.APIError('Authentication failed', 401));
    }
};
exports.authenticate = authenticate;
//# sourceMappingURL=auth.middleware.js.map