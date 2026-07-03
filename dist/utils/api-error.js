"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createError = exports.APIError = void 0;
class APIError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.APIError = APIError;
const createError = (message, statusCode = 500) => {
    return new APIError(message, statusCode);
};
exports.createError = createError;
//# sourceMappingURL=api-error.js.map