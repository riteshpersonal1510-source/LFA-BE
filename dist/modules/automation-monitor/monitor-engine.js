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
exports.monitorEngine = exports.MonitorEngine = void 0;
const execution_log_model_1 = require("./execution-log.model");
const area_automation_model_1 = require("../../automation/area-automation.model");
const logger_1 = require("../../utils/logger");
const socket_manager_1 = require("./socket-manager");
function nowISO() {
    return new Date().toISOString();
}
function makeLog(message, level = 'info') {
    return { timestamp: nowISO(), message, level };
}
class MonitorEngine {
    constructor() {
        this.sessionMemoryLogs = new Map();
        this.sessionStartTime = new Map();
    }
    onAutomationCreated(sessionId, name) {
        const logEntry = makeLog(`Automation created: ${name}`, 'info');
        this.addToMemoryLog(sessionId, logEntry);
        (0, socket_manager_1.emitAutomationCreated)(sessionId, { name });
        (0, socket_manager_1.emitLogAdded)(sessionId, logEntry);
    }
    onAutomationStarted(sessionId) {
        const logEntry = makeLog('Automation started', 'info');
        this.addToMemoryLog(sessionId, logEntry);
        (0, socket_manager_1.emitAutomationStarted)(sessionId);
        (0, socket_manager_1.emitLogAdded)(sessionId, logEntry);
        (0, socket_manager_1.emitSessionStatus)(sessionId, 'running');
    }
    onAutomationLog(sessionId, message, level = 'info') {
        const logEntry = makeLog(message, level);
        this.addToMemoryLog(sessionId, logEntry);
        (0, socket_manager_1.emitLogAdded)(sessionId, logEntry);
    }
    async onJobStarted(job) {
        const now = new Date();
        if (!this.sessionStartTime.has(job.sessionId)) {
            this.sessionStartTime.set(job.sessionId, now.getTime());
        }
        const logEntry = makeLog(`Starting ${job.businessType} in ${job.city}${job.area ? `, ${job.area}` : ''} (${job.sources.join(', ')})`, 'info');
        try {
            await execution_log_model_1.ExecutionLogModel.create({
                sessionId: job.sessionId,
                jobId: job._id,
                state: job.state,
                city: job.city,
                area: job.area || '',
                businessType: job.businessType,
                sources: job.sources,
                status: 'running',
                totalLeads: 0,
                sourceResults: [],
                startedAt: now,
                completedAt: null,
                duration: null,
                error: null,
                workerId: job.sessionId,
                logs: [logEntry],
            });
        }
        catch (err) {
            logger_1.logger.error({ err, sessionId: job.sessionId }, 'MonitorEngine: Failed to create execution log');
        }
        this.addToMemoryLog(job.sessionId, logEntry);
        (0, socket_manager_1.emitLogAdded)(job.sessionId, logEntry);
        (0, socket_manager_1.emitJobStarted)(job.sessionId, {
            jobId: job._id,
            area: job.area || '',
            city: job.city,
            businessType: job.businessType,
            sources: job.sources,
            queuePosition: job.queuePosition,
            totalJobs: job.totalJobs,
        });
        (0, socket_manager_1.emitSessionStatus)(job.sessionId, 'running');
    }
    async onJobProgress(job) {
        const logEntry = makeLog(job.progress, 'info');
        this.addToMemoryLog(job.sessionId, logEntry);
        await execution_log_model_1.ExecutionLogModel.updateOne({ jobId: job._id }, {
            $push: { logs: logEntry },
            $set: {
                totalLeads: job.totalLeads ?? 0,
                sourceResults: job.sourceResults ?? [],
            },
        });
        (0, socket_manager_1.emitLogAdded)(job.sessionId, logEntry);
        (0, socket_manager_1.emitJobProgress)(job.sessionId, {
            jobId: job._id,
            area: job.area || '',
            city: job.city,
            progress: job.progress,
            totalLeads: job.totalLeads,
            currentStage: job.currentStage,
            sourceResults: job.sourceResults,
        });
    }
    async onJobCompleted(job) {
        const now = new Date();
        const logEntry = makeLog(`Completed ${job.businessType} in ${job.city}${job.area ? `, ${job.area}` : ''}: ${job.totalLeads} leads from ${job.sources.length} sources`, 'success');
        const startDoc = await execution_log_model_1.ExecutionLogModel.findOne({ jobId: job._id }, { startedAt: 1 });
        const duration = startDoc?.startedAt
            ? now.getTime() - startDoc.startedAt.getTime()
            : 0;
        await execution_log_model_1.ExecutionLogModel.updateOne({ jobId: job._id }, {
            $push: { logs: logEntry },
            $set: {
                status: 'completed',
                completedAt: now,
                duration,
                totalLeads: job.totalLeads,
                sourceResults: job.sourceResults,
            },
        });
        this.addToMemoryLog(job.sessionId, logEntry);
        (0, socket_manager_1.emitLogAdded)(job.sessionId, logEntry);
        (0, socket_manager_1.emitJobCompleted)(job.sessionId, {
            jobId: job._id,
            area: job.area || '',
            city: job.city,
            totalLeads: job.totalLeads,
            duration,
            sources: job.sources,
        });
    }
    async onJobFailed(job) {
        const now = new Date();
        const logEntry = makeLog(`Failed ${job.businessType} in ${job.city}${job.area ? `, ${job.area}` : ''}: ${job.error}`, 'error');
        const startDoc = await execution_log_model_1.ExecutionLogModel.findOne({ jobId: job._id }, { startedAt: 1 });
        const duration = startDoc?.startedAt
            ? now.getTime() - startDoc.startedAt.getTime()
            : 0;
        await execution_log_model_1.ExecutionLogModel.updateOne({ jobId: job._id }, {
            $push: { logs: logEntry },
            $set: {
                status: 'failed',
                completedAt: now,
                duration,
                error: job.error,
            },
        });
        this.addToMemoryLog(job.sessionId, logEntry);
        (0, socket_manager_1.emitLogAdded)(job.sessionId, logEntry);
        (0, socket_manager_1.emitJobFailed)(job.sessionId, {
            jobId: job._id,
            area: job.area || '',
            city: job.city,
            error: job.error,
            duration,
        });
    }
    onSessionCompleted(sessionId) {
        const logEntry = makeLog('All jobs completed', 'success');
        this.addToMemoryLog(sessionId, logEntry);
        (0, socket_manager_1.emitLogAdded)(sessionId, logEntry);
        (0, socket_manager_1.emitSessionStatus)(sessionId, 'completed');
        this.sessionStartTime.delete(sessionId);
    }
    onSessionFailed(sessionId, reason) {
        const logEntry = makeLog(`Automation failed: ${reason}`, 'error');
        this.addToMemoryLog(sessionId, logEntry);
        (0, socket_manager_1.emitLogAdded)(sessionId, logEntry);
        (0, socket_manager_1.emitSessionStatus)(sessionId, 'failed', { reason });
        this.sessionStartTime.delete(sessionId);
    }
    onSessionStopped(sessionId) {
        const logEntry = makeLog('Automation stopped by user', 'warn');
        this.addToMemoryLog(sessionId, logEntry);
        (0, socket_manager_1.emitLogAdded)(sessionId, logEntry);
        (0, socket_manager_1.emitSessionStatus)(sessionId, 'paused');
        this.sessionStartTime.delete(sessionId);
    }
    onSessionResumed(sessionId) {
        const logEntry = makeLog('Automation resumed', 'info');
        this.addToMemoryLog(sessionId, logEntry);
        (0, socket_manager_1.emitLogAdded)(sessionId, logEntry);
        (0, socket_manager_1.emitSessionStatus)(sessionId, 'running');
    }
    onLeadSaved(sessionId, businessName, source, totalSaved) {
        (0, socket_manager_1.emitLeadSaved)(sessionId, { businessName, source, totalSaved });
        this.onAutomationLog(sessionId, `Lead saved: ${businessName}`, 'success');
    }
    onDuplicateSkipped(sessionId, businessName, totalDuplicates) {
        (0, socket_manager_1.emitDuplicateRemoved)(sessionId, { businessName, totalDuplicates });
        this.onAutomationLog(sessionId, `Duplicate skipped: ${businessName}`, 'warn');
    }
    onLeadRejected(sessionId, businessName, totalRejected) {
        (0, socket_manager_1.emitLeadRejected)(sessionId, { businessName, totalRejected });
        this.onAutomationLog(sessionId, `Lead rejected: ${businessName}`, 'warn');
    }
    async emitSessionProgress(sessionId) {
        const session = await (await Promise.resolve().then(() => __importStar(require('../../automation/area-automation.model')))).AreaSessionModel.findById(sessionId).lean();
        if (!session)
            return;
        const [totalJobs, completedJobs, failedJobs, runningJobs, pendingJobs, activeJob] = await Promise.all([
            area_automation_model_1.AreaJobModel.countDocuments({ sessionId }),
            area_automation_model_1.AreaJobModel.countDocuments({ sessionId, status: 'completed' }),
            area_automation_model_1.AreaJobModel.countDocuments({ sessionId, status: 'failed' }),
            area_automation_model_1.AreaJobModel.countDocuments({ sessionId, status: 'running' }),
            area_automation_model_1.AreaJobModel.countDocuments({ sessionId, status: 'pending' }),
            area_automation_model_1.AreaJobModel.findOne({ sessionId, status: 'running' }).sort({ startedAt: -1 }).lean(),
        ]);
        const processedJobs = completedJobs + failedJobs;
        const progressPercent = totalJobs > 0 ? Math.round((processedJobs / totalJobs) * 100) : 0;
        const startTime = this.sessionStartTime.get(sessionId) || (session.startedAt ? new Date(session.startedAt).getTime() : Date.now());
        const elapsedMs = Date.now() - startTime;
        const avgJobMs = processedJobs > 0 ? elapsedMs / processedJobs : 0;
        const remainingJobs = pendingJobs + runningJobs;
        const etaMs = avgJobMs > 0 && remainingJobs > 0 ? Math.round(avgJobMs * remainingJobs) : null;
        (0, socket_manager_1.emitSessionProgress)(sessionId, {
            status: session.status,
            totalJobs,
            completedJobs,
            failedJobs,
            runningJobs,
            pendingJobs,
            totalLeads: session.totalLeads || 0,
            savedLeads: session.savedLeads || 0,
            duplicates: session.duplicates || 0,
            rejected: session.rejected || 0,
            progressPercent,
            elapsedMs,
            etaMs,
            currentCity: activeJob?.city || null,
            currentArea: activeJob?.area || null,
            currentStage: activeJob?.currentStage || session.currentStage || null,
            currentBusinessType: activeJob?.businessType || null,
        });
    }
    async getLogs(sessionId, limit = 200) {
        const docs = await execution_log_model_1.ExecutionLogModel.find({ sessionId })
            .sort({ startedAt: -1 })
            .limit(limit)
            .lean();
        return docs.map(d => ({
            ...d,
            id: d._id.toString(),
            _id: undefined,
        }));
    }
    async getLiveStatus(sessionId) {
        const session = await (await Promise.resolve().then(() => __importStar(require('../../automation/area-automation.model')))).AreaSessionModel.findById(sessionId).lean();
        if (!session)
            return null;
        const activeJob = await area_automation_model_1.AreaJobModel.findOne({ sessionId, status: 'running' }).sort({ startedAt: -1 }).lean();
        const totalJobs = await area_automation_model_1.AreaJobModel.countDocuments({ sessionId });
        const processedJobs = await area_automation_model_1.AreaJobModel.countDocuments({ sessionId, status: { $in: ['completed', 'failed'] } });
        const startTime = this.sessionStartTime.get(sessionId);
        const uptime = startTime ? Date.now() - startTime : 0;
        return {
            sessionId,
            status: session.status,
            currentJob: activeJob ? {
                id: activeJob._id.toString(),
                area: activeJob.area || '',
                city: activeJob.city,
                businessType: activeJob.businessType,
                progress: activeJob.progress,
                startedAt: activeJob.startedAt?.toISOString() ?? null,
                elapsed: activeJob.startedAt ? Date.now() - activeJob.startedAt.getTime() : 0,
            } : null,
            queueLength: totalJobs - processedJobs,
            processed: processedJobs,
            total: totalJobs,
            leadsFound: session.totalLeads,
            startedAt: session.startedAt?.toISOString() ?? null,
            uptime,
        };
    }
    async getStats(sessionId) {
        const logs = await execution_log_model_1.ExecutionLogModel.find({ sessionId }).lean();
        const jobs = await area_automation_model_1.AreaJobModel.find({ sessionId }).lean();
        const totalJobs = jobs.length;
        const completedJobs = jobs.filter(j => j.status === 'completed').length;
        const failedJobs = jobs.filter(j => j.status === 'failed').length;
        const runningJobs = jobs.filter(j => j.status === 'running').length;
        const pendingJobs = jobs.filter(j => j.status === 'pending').length;
        const totalLeads = logs.reduce((sum, l) => sum + (l.totalLeads || 0), 0);
        const totalDuration = logs.reduce((sum, l) => sum + (l.duration || 0), 0);
        const completedLogs = logs.filter(l => l.status === 'completed');
        const avgJobDuration = completedLogs.length > 0
            ? Math.round(totalDuration / completedLogs.length)
            : 0;
        const leadsBySource = {};
        for (const log of logs) {
            for (const sr of log.sourceResults || []) {
                leadsBySource[sr.source] = (leadsBySource[sr.source] || 0) + (sr.totalStored || 0);
            }
        }
        const errorMap = new Map();
        for (const log of logs) {
            if (log.status === 'failed' && log.error) {
                const key = `${log.city}:${log.area}`;
                const existing = errorMap.get(key);
                if (existing) {
                    existing.count++;
                }
                else {
                    errorMap.set(key, {
                        area: log.area,
                        city: log.city,
                        error: log.error,
                        count: 1,
                    });
                }
            }
        }
        return {
            totalJobs,
            completedJobs,
            failedJobs,
            runningJobs,
            pendingJobs,
            totalLeads,
            totalDuration,
            avgJobDuration,
            leadsBySource,
            errorsByArea: Array.from(errorMap.values()),
        };
    }
    clearMemoryLogs(sessionId) {
        this.sessionMemoryLogs.delete(sessionId);
        this.sessionStartTime.delete(sessionId);
    }
    getMemoryLogs(sessionId) {
        return this.sessionMemoryLogs.get(sessionId) || [];
    }
    addToMemoryLog(sessionId, entry) {
        if (!this.sessionMemoryLogs.has(sessionId)) {
            this.sessionMemoryLogs.set(sessionId, []);
        }
        this.sessionMemoryLogs.get(sessionId).push(entry);
        if (this.sessionMemoryLogs.get(sessionId).length > 1000) {
            this.sessionMemoryLogs.get(sessionId).shift();
        }
    }
}
exports.MonitorEngine = MonitorEngine;
exports.monitorEngine = new MonitorEngine();
//# sourceMappingURL=monitor-engine.js.map