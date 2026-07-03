"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateObjectId = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("../utils/logger");
const validateObjectId = (paramName = 'id') => {
    return (req, res, next) => {
        const id = req.params[paramName];
        if (!id || id === 'undefined' || id === 'null' || id === '') {
            logger_1.logger.warn(`[validateObjectId] Missing or invalid ${paramName}: "${id}" from ${req.method} ${req.path}`);
            res.status(400).json({
                success: false,
                message: `Invalid ${paramName}: "${id}" is not a valid ID`,
            });
            return;
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            logger_1.logger.warn(`[validateObjectId] Invalid ObjectId format for ${paramName}: "${id}" from ${req.method} ${req.path}`);
            res.status(400).json({
                success: false,
                message: `Invalid ${paramName} format`,
            });
            return;
        }
        next();
    };
};
exports.validateObjectId = validateObjectId;
//# sourceMappingURL=validate-objectid.middleware.js.map