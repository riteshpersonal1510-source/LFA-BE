"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = exports.AuthController = void 0;
const auth_service_1 = require("../services/auth.service");
const api_response_1 = require("../utils/api-response");
const api_error_1 = require("../utils/api-error");
class AuthController {
    async login(req, res, next) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                throw new api_error_1.APIError('Email and password are required', 400);
            }
            const result = await auth_service_1.authService.login(email, password);
            const isSecureCookie = process.env.NODE_ENV === 'production' || Boolean(process.env.NGROK_URL);
            if (isSecureCookie) {
                res.cookie('accessToken', result.accessToken, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'none',
                    maxAge: 8 * 60 * 60 * 1000,
                    path: '/',
                });
            }
            else {
                res.cookie('accessToken', result.accessToken, {
                    httpOnly: true,
                    secure: false,
                    sameSite: 'lax',
                    maxAge: 8 * 60 * 60 * 1000,
                    path: '/',
                });
            }
            api_response_1.APIResponse.success(res, { user: result.user, accessToken: result.accessToken, expiresIn: result.expiresIn }, 'Login successful');
        }
        catch (error) {
            next(error);
        }
    }
    async logout(_req, res, next) {
        try {
            res.clearCookie('accessToken', {
                path: '/',
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production' || Boolean(process.env.NGROK_URL),
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            });
            api_response_1.APIResponse.success(res, null, 'Logged out successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async getCurrentUser(req, res, next) {
        try {
            const authReq = req;
            const user = await auth_service_1.authService.getCurrentUser(authReq.user.id);
            api_response_1.APIResponse.success(res, user, 'User fetched successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async changePassword(req, res, next) {
        try {
            const authReq = req;
            const { currentPassword, newPassword } = req.body;
            if (!currentPassword || !newPassword) {
                throw new api_error_1.APIError('Current password and new password are required', 400);
            }
            if (newPassword.length < 8) {
                throw new api_error_1.APIError('New password must be at least 8 characters', 400);
            }
            await auth_service_1.authService.changePassword(authReq.user.id, currentPassword, newPassword);
            res.clearCookie('accessToken', {
                path: '/',
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production' || Boolean(process.env.NGROK_URL),
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            });
            api_response_1.APIResponse.success(res, null, 'Password changed successfully. Please login again.');
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AuthController = AuthController;
exports.authController = new AuthController();
//# sourceMappingURL=auth.controller.js.map