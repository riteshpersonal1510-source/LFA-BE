"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasRole = exports.getUserRoleFromRequest = exports.clearAuthCookies = exports.setAuthCookies = exports.getCookieOptions = void 0;
const getCookieOptions = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    };
};
exports.getCookieOptions = getCookieOptions;
const setAuthCookies = (res, accessToken, refreshToken) => {
    const cookieOptions = (0, exports.getCookieOptions)();
    res.cookie('refreshToken', refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.cookie('accessToken', accessToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000,
    });
};
exports.setAuthCookies = setAuthCookies;
const clearAuthCookies = (res) => {
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    });
    res.clearCookie('accessToken', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    });
};
exports.clearAuthCookies = clearAuthCookies;
const getUserRoleFromRequest = (req) => {
    return req.user?.role;
};
exports.getUserRoleFromRequest = getUserRoleFromRequest;
const hasRole = (userRole, requiredRoles) => {
    return requiredRoles.includes(userRole);
};
exports.hasRole = hasRole;
//# sourceMappingURL=auth-utils.js.map