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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHealthReport = getHealthReport;
exports.getSimpleHealth = getSimpleHealth;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("../utils/logger");
const Lead_1 = require("../models/Lead");
const SearchHistory_1 = require("../models/SearchHistory");
const pipeline_tracker_1 = require("./pipeline-tracker");
const recovery_orchestrator_1 = require("./recovery-orchestrator");
async function checkComponent(name, check, timeoutMs = 5000) {
    const start = Date.now();
    try {
        const result = await Promise.race([
            check(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs)),
        ]);
        const latencyMs = Date.now() - start;
        if (result === null) {
            return { name, status: 'healthy', latencyMs };
        }
        return { name, status: 'degraded', message: result, latencyMs };
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return { name, status: 'unhealthy', message: msg, latencyMs: Date.now() - start };
    }
}
async function checkMongoDB() {
    const state = mongoose_1.default.connection.readyState;
    if (state === 1)
        return null;
    try {
        await mongoose_1.default.connection.db?.admin().ping();
        return null;
    }
    catch {
        return `Connection state: ${state}`;
    }
}
async function checkGoogleMaps() {
    const recent = await SearchHistory_1.SearchHistory.find({
        sources: 'google-maps',
        startedAt: { $gte: new Date(Date.now() - 86400000) },
    })
        .sort({ startedAt: -1 })
        .limit(5)
        .lean();
    if (recent.length === 0)
        return null;
    const failures = recent.filter(r => r.status === 'FAILED' || r.status === 'TIMEOUT' || String(r.searchState).includes('GOOGLE_BLOCKED'));
    if (failures.length >= 3) {
        return `${failures.length}/${recent.length} recent searches failed`;
    }
    return null;
}
async function checkJustDial() {
    const recent = await SearchHistory_1.SearchHistory.find({
        sources: 'justdial',
        startedAt: { $gte: new Date(Date.now() - 86400000) },
    })
        .sort({ startedAt: -1 })
        .limit(5)
        .lean();
    if (recent.length === 0)
        return null;
    const failures = recent.filter(r => r.status === 'FAILED' || r.status === 'TIMEOUT');
    if (failures.length >= 3) {
        return `${failures.length}/${recent.length} recent searches failed`;
    }
    return null;
}
async function checkIndiaMART() {
    const recent = await SearchHistory_1.SearchHistory.find({
        sources: 'indiamart',
        startedAt: { $gte: new Date(Date.now() - 86400000) },
    })
        .sort({ startedAt: -1 })
        .limit(5)
        .lean();
    if (recent.length === 0)
        return null;
    const failures = recent.filter(r => r.status === 'FAILED' || r.status === 'TIMEOUT');
    if (failures.length >= 3) {
        return `${failures.length}/${recent.length} recent searches failed`;
    }
    return null;
}
async function checkClutch() {
    const recent = await SearchHistory_1.SearchHistory.find({
        sources: 'clutch',
        startedAt: { $gte: new Date(Date.now() - 86400000) },
    })
        .sort({ startedAt: -1 })
        .limit(5)
        .lean();
    if (recent.length === 0)
        return null;
    const failures = recent.filter(r => r.status === 'FAILED' || r.status === 'TIMEOUT');
    if (failures.length >= 3) {
        return `${failures.length}/${recent.length} recent searches failed`;
    }
    return null;
}
async function checkWebsiteEnrichment() {
    try {
        const pending = await Lead_1.Lead.countDocuments({
            $or: [
                { enrichmentStatus: { $in: ['pending', null, 'failed'] } },
                { enrichmentStatus: { $exists: false } },
            ],
            website: { $exists: true, $nin: [null, ''] },
        }).maxTimeMS(5000);
        if (pending > 1000) {
            return `${pending} leads pending enrichment`;
        }
        return null;
    }
    catch {
        return 'Query timed out';
    }
}
async function checkWorkers() {
    const queueStatus = recovery_orchestrator_1.recoveryOrchestrator.getQueueStatus();
    const pipelines = (0, pipeline_tracker_1.getAllPipelines)();
    const runningPipelines = pipelines.filter(p => p.overallStatus === 'running');
    return {
        activeTasks: queueStatus.activeCount,
        queuedTasks: queueStatus.queueLength,
        runningPipelines: runningPipelines.length,
        maxConcurrent: queueStatus.maxConcurrent,
    };
}
async function checkSocketIO() {
    try {
        const { getSocketIO } = await Promise.resolve().then(() => __importStar(require('../modules/automation-monitor/socket-manager')));
        const io = getSocketIO();
        if (!io) {
            return 'Socket.IO not initialized';
        }
        const sockets = await io.of('/automation-monitor').fetchSockets().catch(() => null);
        if (sockets === null) {
            return 'Socket.IO namespace not accessible';
        }
        return null;
    }
    catch {
        return 'Socket.IO check failed';
    }
}
const HEALTH_CHECKS = [
    { name: 'MongoDB', check: checkMongoDB },
    { name: 'Google Maps', check: checkGoogleMaps },
    { name: 'JustDial', check: checkJustDial },
    { name: 'IndiaMART', check: checkIndiaMART },
    { name: 'Clutch', check: checkClutch },
    { name: 'Website Enrichment', check: checkWebsiteEnrichment },
    { name: 'Workers', check: checkWorkers },
    { name: 'Socket.IO', check: checkSocketIO },
];
async function getHealthReport() {
    const componentResults = await Promise.all(HEALTH_CHECKS.map(hc => checkComponent(hc.name, hc.check)));
    const healthy = componentResults.filter(c => c.status === 'healthy').length;
    const degraded = componentResults.filter(c => c.status === 'degraded').length;
    const unhealthy = componentResults.filter(c => c.status === 'unhealthy').length;
    const overall = unhealthy > 0 ? 'unhealthy' : degraded > 0 ? 'degraded' : 'healthy';
    const report = {
        status: overall,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        components: componentResults,
        summary: { total: componentResults.length, healthy, degraded, unhealthy },
    };
    logger_1.logger.info({
        status: report.status,
        healthy: report.summary.healthy,
        degraded: report.summary.degraded,
        unhealthy: report.summary.unhealthy,
    }, 'HealthCheck: Report generated');
    return report;
}
async function getSimpleHealth() {
    const dbState = mongoose_1.default.connection.readyState;
    const dbStatus = dbState === 1 ? 'connected' : 'disconnected';
    return {
        status: dbState === 1 ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        database: dbStatus,
    };
}
//# sourceMappingURL=health-check.js.map