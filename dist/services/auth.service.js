"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const bcryptjs_1 = require("bcryptjs");
const jsonwebtoken_1 = require("jsonwebtoken");
const User_1 = require("../models/User");
const api_error_1 = require("../utils/api-error");
const logger_1 = require("../utils/logger");
function getJwtSecret() {
    return process.env.JWT_SECRET || 'fallback-secret-do-not-use';
}
function getJwtExpiresIn() {
    return process.env.JWT_EXPIRES_IN || '8h';
}
function parseDuration(duration) {
    const match = duration.match(/^(\d+)\s*(h|hour|hours|m|min|minute|minutes|d|day|days)$/i);
    if (!match)
        return 8 * 60 * 60 * 1000;
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    switch (unit) {
        case 'h':
        case 'hour':
        case 'hours':
            return value * 60 * 60 * 1000;
        case 'm':
        case 'min':
        case 'minute':
        case 'minutes':
            return value * 60 * 1000;
        case 'd':
        case 'day':
        case 'days':
            return value * 24 * 60 * 60 * 1000;
        default:
            return 8 * 60 * 60 * 1000;
    }
}
class AuthService {
    async ensureAdmin() {
        const adminEmail = process.env.ADMIN_EMAIL;
        if (!adminEmail) {
            throw new api_error_1.APIError('ADMIN_EMAIL not configured', 500);
        }
        const passwordHash = process.env.ADMIN_PASSWORD_HASH;
        if (!passwordHash) {
            throw new api_error_1.APIError('ADMIN_PASSWORD_HASH not configured. Run: node src/seed.ts', 500);
        }
        const existing = await User_1.User.findOne({ email: adminEmail }).select('+password');
        const seedName = adminEmail.split('@')[0].split(/[._]/)[0].charAt(0).toUpperCase()
            + adminEmail.split('@')[0].split(/[._]/)[0].slice(1);
        if (existing) {
            if (existing.password !== passwordHash) {
                existing.password = passwordHash;
                await existing.save({ validateBeforeSave: false });
                logger_1.logger.info(`Admin password synced: ${adminEmail}`);
            }
            return;
        }
        await User_1.User.create({
            email: adminEmail,
            password: passwordHash,
            name: seedName,
            role: 'admin',
        });
        logger_1.logger.info(`Admin user seeded: ${adminEmail}`);
    }
    async login(email, password) {
        const adminEmail = process.env.ADMIN_EMAIL;
        if (!adminEmail) {
            throw new api_error_1.APIError('Server not configured', 500);
        }
        if (email.toLowerCase() !== adminEmail.toLowerCase()) {
            throw new api_error_1.APIError('Invalid email or password', 401);
        }
        const user = await User_1.User.findOne({ email: adminEmail }).select('+password');
        if (!user) {
            throw new api_error_1.APIError('Invalid email or password', 401);
        }
        const isValid = await (0, bcryptjs_1.compare)(password, user.password);
        if (!isValid) {
            throw new api_error_1.APIError('Invalid email or password', 401);
        }
        user.lastLoginAt = new Date();
        await user.save({ validateBeforeSave: false });
        const accessToken = (0, jsonwebtoken_1.sign)({ userId: user._id.toString(), role: 'admin' }, getJwtSecret(), { expiresIn: getJwtExpiresIn() });
        logger_1.logger.info(`Admin logged in: ${adminEmail}`);
        const displayName = user.name !== 'Admin'
            ? user.name
            : user.email.split('@')[0].split(/[._]/)[0].charAt(0).toUpperCase()
                + user.email.split('@')[0].split(/[._]/)[0].slice(1);
        const expiresInMs = typeof getJwtExpiresIn() === 'string'
            ? parseDuration(getJwtExpiresIn())
            : 8 * 60 * 60 * 1000;
        return {
            user: {
                id: user._id.toString(),
                email: user.email,
                name: displayName,
                role: 'admin',
            },
            accessToken,
            expiresIn: expiresInMs,
        };
    }
    async getCurrentUser(userId) {
        const user = await User_1.User.findById(userId);
        if (!user) {
            throw new api_error_1.APIError('Admin not found', 404);
        }
        const displayName = user.name !== 'Admin'
            ? user.name
            : user.email.split('@')[0].split(/[._]/)[0].charAt(0).toUpperCase()
                + user.email.split('@')[0].split(/[._]/)[0].slice(1);
        return {
            id: user._id.toString(),
            email: user.email,
            name: displayName,
            role: 'admin',
        };
    }
    async changePassword(userId, currentPassword, newPassword) {
        const user = await User_1.User.findById(userId).select('+password');
        if (!user) {
            throw new api_error_1.APIError('Admin not found', 404);
        }
        const isValid = await (0, bcryptjs_1.compare)(currentPassword, user.password);
        if (!isValid) {
            throw new api_error_1.APIError('Current password is incorrect', 401);
        }
        user.password = await (0, bcryptjs_1.hash)(newPassword, 10);
        await user.save();
        logger_1.logger.info(`Admin password changed: ${user.email}`);
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
//# sourceMappingURL=auth.service.js.map