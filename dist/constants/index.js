"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXTRACTION_STATUSES = exports.EXTRACTION_SOURCES = exports.LEAD_SOURCES = exports.PAGINATION_DEFAULT = exports.API_PREFIX = exports.APP_NAME = void 0;
__exportStar(require("./analysis"), exports);
exports.APP_NAME = 'Lead Finder Agent';
exports.API_PREFIX = '/api/v1';
exports.PAGINATION_DEFAULT = {
    page: 1,
    limit: 10,
    maxLimit: 100000,
};
exports.LEAD_SOURCES = [
    'google-maps',
    'justdial',
    'indiamart',
    'clutch',
    'linkedin',
    'directory',
    'website',
    'manual'
];
exports.EXTRACTION_SOURCES = [
    'google-maps',
    'justdial',
    'indiamart',
    'clutch'
];
exports.EXTRACTION_STATUSES = ['success', 'partial', 'failed'];
//# sourceMappingURL=index.js.map