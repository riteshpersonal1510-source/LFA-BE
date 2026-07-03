"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundMiddleware = void 0;
function setCorsHeaders(res) {
    const origin = '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, ngrok-skip-browser-warning, X-Requested-With, X-CSRF-Token, Cache-Control, Pragma');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
}
const notFoundMiddleware = (req, res, _next) => {
    setCorsHeaders(res);
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.path} not found`,
    });
};
exports.notFoundMiddleware = notFoundMiddleware;
//# sourceMappingURL=not-found.middleware.js.map