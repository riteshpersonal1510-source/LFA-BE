"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildBackendHealthPayload = buildBackendHealthPayload;
const process_1 = __importDefault(require("process"));
function buildBackendHealthPayload(params) {
    const mem = process_1.default.memoryUsage();
    return {
        status: 'ok',
        backend: 'running',
        uptime: params.uptime,
        database: params.databaseStatus,
        playwright: params.playwrightStatus,
        socket: params.socketStatus,
        pythonScraper: params.pythonScraperUrl,
        scrapingEngine: 'python',
        environment: params.environment,
        port: params.port,
        version: params.version,
        memory: {
            rssMb: Math.round(mem.rss / 1024 / 1024),
            heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
            externalMb: Math.round(mem.external / 1024 / 1024),
        },
        timestamp: new Date().toISOString(),
    };
}
//# sourceMappingURL=health.js.map