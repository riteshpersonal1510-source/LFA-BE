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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardMetrics = getDashboardMetrics;
const SearchHistory_1 = require("../models/SearchHistory");
const Lead_1 = require("../models/Lead");
const SOURCES = ['google-maps', 'justdial', 'indiamart', 'clutch', 'official-website'];
async function getDashboardMetrics(days = 7) {
    const now = new Date();
    const start = new Date(now.getTime() - days * 86400000);
    const searchRecords = await SearchHistory_1.SearchHistory.find({
        startedAt: { $gte: start },
    }).lean();
    const total = searchRecords.length;
    const completed = searchRecords.filter(r => r.status === 'COMPLETED').length;
    const failed = searchRecords.filter(r => r.status === 'FAILED').length;
    const stopped = searchRecords.filter(r => r.status === 'STOPPED').length;
    const partial = searchRecords.filter(r => r.status === 'PARTIAL_SUCCESS').length;
    const timeout = searchRecords.filter(r => r.status === 'TIMEOUT').length;
    const noResults = searchRecords.filter(r => r.status === 'NO_RESULTS').length;
    const leadStats = await getLeadStats();
    const sourcePerformance = computeSourcePerformance(searchRecords);
    const pipelineStatus = await getPipelineStatus();
    const dailyTrend = computeDailyTrend(searchRecords, days);
    return {
        generatedAt: new Date().toISOString(),
        period: {
            days,
            start: start.toISOString(),
            end: now.toISOString(),
        },
        searchStats: { total, completed, failed, stopped, partial, timeout, noResults },
        leadStats,
        sourcePerformance,
        pipelineStatus,
        dailyTrend,
    };
}
async function getLeadStats() {
    try {
        const [total, withWebsite, withPhone, withEmail, enriched, pendingEnrichment] = await Promise.all([
            Lead_1.Lead.countDocuments().maxTimeMS(10000),
            Lead_1.Lead.countDocuments({ website: { $exists: true, $nin: [null, ''] } }).maxTimeMS(10000),
            Lead_1.Lead.countDocuments({ phone: { $exists: true, $nin: [null, ''] } }).maxTimeMS(10000),
            Lead_1.Lead.countDocuments({ email: { $exists: true, $nin: [null, ''] } }).maxTimeMS(10000),
            Lead_1.Lead.countDocuments({ enrichmentStatus: 'completed' }).maxTimeMS(10000),
            Lead_1.Lead.countDocuments({
                $or: [
                    { enrichmentStatus: { $in: ['pending', null, 'failed'] } },
                    { enrichmentStatus: { $exists: false } },
                ],
                website: { $exists: true, $nin: [null, ''] },
            }).maxTimeMS(10000),
        ]);
        return { total, withWebsite, withPhone, withEmail, enriched, pendingEnrichment };
    }
    catch {
        return { total: 0, withWebsite: 0, withPhone: 0, withEmail: 0, enriched: 0, pendingEnrichment: 0 };
    }
}
function computeSourcePerformance(records) {
    return SOURCES.map(source => {
        const sourceRecords = records.filter(r => {
            const sources = r.sources;
            return Array.isArray(sources) && sources.includes(source);
        });
        const total = sourceRecords.length;
        if (total === 0) {
            return {
                source,
                totalSearches: 0,
                successCount: 0,
                failureCount: 0,
                successRate: 0,
                failureRate: 0,
                avgDurationMs: 0,
                totalLeads: 0,
                avgLeadsPerSearch: 0,
            };
        }
        const successful = sourceRecords.filter(r => r.status === 'COMPLETED' || r.status === 'PARTIAL_SUCCESS');
        const successCount = successful.length;
        const failureCount = total - successCount;
        const successRate = Math.round((successCount / total) * 100);
        const failureRate = Math.round((failureCount / total) * 100);
        const withDuration = successful.filter(r => typeof r.duration === 'number' && r.duration > 0);
        const avgDurationMs = withDuration.length > 0
            ? Math.round(withDuration.reduce((sum, r) => sum + r.duration, 0) / withDuration.length)
            : 0;
        const totalLeads = sourceRecords.reduce((sum, r) => sum + (r.totalLeads || 0), 0);
        const avgLeadsPerSearch = total > 0 ? Math.round(totalLeads / total) : 0;
        return {
            source,
            totalSearches: total,
            successCount,
            failureCount,
            successRate,
            failureRate,
            avgDurationMs,
            totalLeads,
            avgLeadsPerSearch,
        };
    });
}
async function getPipelineStatus() {
    try {
        const { getAllPipelines } = await Promise.resolve().then(() => __importStar(require('./pipeline-tracker')));
        const { recoveryOrchestrator } = await Promise.resolve().then(() => __importStar(require('./recovery-orchestrator')));
        const pipelines = getAllPipelines();
        const queueStatus = recoveryOrchestrator.getQueueStatus();
        return {
            activePipelines: pipelines.filter(p => p.overallStatus === 'running').length,
            queuedTasks: queueStatus.queueLength,
            activeTasks: queueStatus.activeCount,
        };
    }
    catch {
        return { activePipelines: 0, queuedTasks: 0, activeTasks: 0 };
    }
}
function computeDailyTrend(records, days) {
    const trend = [];
    for (let i = days - 1; i >= 0; i--) {
        const dayStart = new Date(Date.now() - i * 86400000);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);
        const dayRecords = records.filter(r => {
            const startedAt = r.startedAt;
            if (!startedAt)
                return false;
            const d = new Date(startedAt);
            return d >= dayStart && d <= dayEnd;
        });
        trend.push({
            date: dayStart.toISOString().split('T')[0],
            searches: dayRecords.length,
            leadsFound: dayRecords.reduce((sum, r) => sum + (r.totalFound || 0), 0),
            leadsSaved: dayRecords.reduce((sum, r) => sum + (r.uniqueSaved || 0), 0),
        });
    }
    return trend;
}
//# sourceMappingURL=dashboard-metrics.js.map