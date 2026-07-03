"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.areaAutomationEngine = exports.AreaAutomationEngine = void 0;
const crypto_1 = require("crypto");
const logger_1 = require("../utils/logger");
const area_automation_model_1 = require("./area-automation.model");
const area_queue_1 = require("../core/scraper-engine/area-queue");
const monitor_engine_1 = require("../modules/automation-monitor/monitor-engine");
class AreaAutomationEngine {
    async startAutomation(req) {
        const { businessTypes, state, cities, country, sources, name, maxLeads, concurrency, retryEnabled, dedupEnabled, aiAuditEnabled, autoOutreach, autoReport, autoWhatsApp, schedule, frequency } = req;
        const sessionId = (0, crypto_1.randomUUID)();
        const totalJobs = cities.length * businessTypes.length;
        if (totalJobs === 0) {
            throw new Error('No jobs generated - check that the selected city and business types are valid');
        }
        const session = await area_automation_model_1.AreaSessionModel.create({
            _id: sessionId,
            name: name || `${businessTypes[0]} - ${state} - ${cities.join(', ')}`,
            businessTypes,
            state,
            cities,
            country,
            sources,
            status: 'running',
            totalJobs,
            completedJobs: 0,
            failedJobs: 0,
            runningJobs: 0,
            skippedJobs: 0,
            totalLeads: 0,
            savedLeads: 0,
            duplicates: 0,
            rejected: 0,
            currentJobId: null,
            currentStage: 'starting',
            lastHeartbeat: new Date(),
            startedAt: new Date(),
            completedAt: null,
            pausedAt: null,
            archivedAt: null,
            retryCount: 0,
            lastRunAt: new Date(),
            maxLeads: maxLeads || 100,
            concurrency: concurrency || 2,
            retryEnabled: retryEnabled !== undefined ? retryEnabled : true,
            dedupEnabled: dedupEnabled !== undefined ? dedupEnabled : true,
            aiAuditEnabled: aiAuditEnabled || false,
            autoOutreach: autoOutreach || false,
            autoReport: autoReport || false,
            autoWhatsApp: autoWhatsApp || false,
            schedule: schedule || '',
            frequency: frequency || 'once',
        });
        logger_1.logger.info({ sessionId, businessTypes, state, cities, sources, totalJobs }, 'Engine: Automation session created');
        monitor_engine_1.monitorEngine.onAutomationCreated(sessionId, session.name);
        monitor_engine_1.monitorEngine.onAutomationLog(sessionId, 'Generating jobs...', 'info');
        const jobs = [];
        for (const city of cities) {
            for (const businessType of businessTypes) {
                jobs.push({ businessType, state: state || '', city, area: '', country, sources });
            }
        }
        await area_queue_1.areaQueue.enqueueJobs(sessionId, jobs);
        logger_1.logger.info({ sessionId, jobCount: jobs.length }, 'Engine: Jobs enqueued');
        setImmediate(() => {
            area_queue_1.areaQueue.startProcessing(sessionId).catch((err) => {
                logger_1.logger.error({ err: err instanceof Error ? err.message : String(err), sessionId }, 'Engine: Queue processing failed');
            });
        });
        return this.toSessionDTO(session);
    }
    async saveDraft(req) {
        const { businessTypes, state, cities, country, sources, name, maxLeads, concurrency, retryEnabled, dedupEnabled, aiAuditEnabled, autoOutreach, autoReport, autoWhatsApp, schedule, frequency } = req;
        const sessionId = (0, crypto_1.randomUUID)();
        const session = await area_automation_model_1.AreaSessionModel.create({
            _id: sessionId,
            name: name || `${(businessTypes && businessTypes[0]) || 'New'} - Draft`,
            businessTypes: businessTypes || [],
            state: state || '',
            cities: cities || [],
            country: country || '',
            sources: sources || [],
            status: 'draft',
            totalJobs: 0,
            completedJobs: 0,
            failedJobs: 0,
            runningJobs: 0,
            skippedJobs: 0,
            totalLeads: 0,
            startedAt: null,
            completedAt: null,
            pausedAt: null,
            archivedAt: null,
            retryCount: 0,
            lastRunAt: null,
            maxLeads: maxLeads || 100,
            concurrency: concurrency || 2,
            retryEnabled: retryEnabled !== undefined ? retryEnabled : true,
            dedupEnabled: dedupEnabled !== undefined ? dedupEnabled : true,
            aiAuditEnabled: aiAuditEnabled || false,
            autoOutreach: autoOutreach || false,
            autoReport: autoReport || false,
            autoWhatsApp: autoWhatsApp || false,
            schedule: schedule || '',
            frequency: frequency || 'once',
        });
        logger_1.logger.info({ sessionId }, 'Engine: Draft automation saved');
        return this.toSessionDTO(session);
    }
    async getSession(sessionId) {
        const session = await area_automation_model_1.AreaSessionModel.findById(sessionId);
        return session ? this.toSessionDTO(session) : null;
    }
    async getJobs(sessionId, status, businessType, city) {
        const query = { sessionId };
        if (status)
            query.status = status;
        if (businessType)
            query.businessType = businessType;
        if (city)
            query.city = city;
        const docs = await area_automation_model_1.AreaJobModel.find(query).sort({ queuePosition: 1 }).lean();
        return docs.map((d) => this.toJobDTO(d));
    }
    async getProgress(sessionId) {
        const session = await this.getSession(sessionId);
        if (!session)
            return null;
        const jobs = await this.getJobs(sessionId);
        const summary = this.calculateSummary(session, jobs, jobs.length);
        if (session.status === 'running' && !area_queue_1.areaQueue.isProcessing(sessionId)) {
            const hasPending = summary.pendingJobs > 0;
            const hasRunning = summary.runningJobs > 0;
            if (!hasPending && !hasRunning) {
                await area_queue_1.areaQueue.syncSessionCounters(sessionId);
            }
        }
        return { session, jobs, summary };
    }
    async getActiveSessions() {
        const docs = await area_automation_model_1.AreaSessionModel.find({ status: 'running' })
            .sort({ lastHeartbeat: -1 })
            .limit(20)
            .lean();
        return docs.map((d) => this.toSessionDTO(d));
    }
    async getRecentSessions(limit = 10) {
        const docs = await area_automation_model_1.AreaSessionModel.find()
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
        return docs.map((d) => this.toSessionDTO(d));
    }
    async getSessionsWithFilters(filters) {
        const { status, search, source, state, city, sortBy = 'createdAt', sortOrder = 'desc', limit = 10, offset = 0 } = filters;
        const query = {};
        if (status)
            query.status = status;
        if (source)
            query.sources = source;
        if (state)
            query.state = state;
        if (city)
            query.cities = city;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { businessTypes: { $regex: search, $options: 'i' } },
                { state: { $regex: search, $options: 'i' } },
                { cities: { $regex: search, $options: 'i' } },
            ];
        }
        const sortField = sortBy === 'totalLeads' ? 'totalLeads' : sortBy === 'status' ? 'status' : 'createdAt';
        const sortObj = { [sortField]: sortOrder === 'asc' ? 1 : -1 };
        const [docs, total] = await Promise.all([
            area_automation_model_1.AreaSessionModel.find(query).sort(sortObj).skip(offset).limit(limit).lean(),
            area_automation_model_1.AreaSessionModel.countDocuments(query),
        ]);
        const sessionIds = docs.map((d) => (d._id || d.id));
        let totalLeadsMap = new Map();
        if (sessionIds.length > 0) {
            const jobAgg = await area_automation_model_1.AreaJobModel.aggregate([
                { $match: { sessionId: { $in: sessionIds } } },
                { $group: { _id: '$sessionId', totalLeads: { $sum: '$totalLeads' } } },
            ]);
            totalLeadsMap = new Map(jobAgg.map(j => [j._id, j.totalLeads]));
        }
        const sessions = docs.map((d) => {
            const dto = this.toSessionDTO(d);
            const fromJobs = totalLeadsMap.get(dto.id);
            if (fromJobs !== undefined) {
                dto.totalLeads = fromJobs;
            }
            return dto;
        });
        return { sessions, total };
    }
    async updateSession(sessionId, updates) {
        const setFields = {};
        if (updates.name !== undefined)
            setFields.name = updates.name;
        if (updates.businessTypes !== undefined)
            setFields.businessTypes = updates.businessTypes;
        if (updates.state !== undefined)
            setFields.state = updates.state;
        if (updates.cities !== undefined)
            setFields.cities = updates.cities;
        if (updates.sources !== undefined)
            setFields.sources = updates.sources;
        if (updates.maxLeads !== undefined)
            setFields.maxLeads = updates.maxLeads;
        if (updates.concurrency !== undefined)
            setFields.concurrency = updates.concurrency;
        if (updates.retryEnabled !== undefined)
            setFields.retryEnabled = updates.retryEnabled;
        if (updates.dedupEnabled !== undefined)
            setFields.dedupEnabled = updates.dedupEnabled;
        if (updates.aiAuditEnabled !== undefined)
            setFields.aiAuditEnabled = updates.aiAuditEnabled;
        if (updates.autoOutreach !== undefined)
            setFields.autoOutreach = updates.autoOutreach;
        if (updates.autoReport !== undefined)
            setFields.autoReport = updates.autoReport;
        if (updates.autoWhatsApp !== undefined)
            setFields.autoWhatsApp = updates.autoWhatsApp;
        if (updates.schedule !== undefined)
            setFields.schedule = updates.schedule;
        if (updates.frequency !== undefined)
            setFields.frequency = updates.frequency;
        const doc = await area_automation_model_1.AreaSessionModel.findByIdAndUpdate(sessionId, { $set: setFields }, { new: true });
        return doc ? this.toSessionDTO(doc) : null;
    }
    async deleteSession(sessionId) {
        await area_queue_1.areaQueue.stopProcessing(sessionId);
        await this.waitForQueueIdle(sessionId, 10000);
        monitor_engine_1.monitorEngine.clearMemoryLogs(sessionId);
        await area_automation_model_1.AreaJobModel.deleteMany({ sessionId });
        const result = await area_automation_model_1.AreaSessionModel.findByIdAndDelete(sessionId);
        logger_1.logger.info({ sessionId }, 'Engine: Automation deleted');
        return !!result;
    }
    async duplicateSession(sessionId) {
        const original = await area_automation_model_1.AreaSessionModel.findById(sessionId).lean();
        if (!original)
            return null;
        const newId = (0, crypto_1.randomUUID)();
        const { _id, createdAt, updatedAt, completedAt, pausedAt, archivedAt, lastRunAt, ...data } = original;
        const newSession = await area_automation_model_1.AreaSessionModel.create({
            _id: newId,
            ...data,
            name: `${data.name || 'Automation'} (Copy)`,
            status: 'draft',
            totalJobs: 0,
            completedJobs: 0,
            failedJobs: 0,
            runningJobs: 0,
            skippedJobs: 0,
            totalLeads: 0,
            startedAt: null,
            completedAt: null,
            pausedAt: null,
            archivedAt: null,
            lastRunAt: null,
        });
        logger_1.logger.info({ originalId: sessionId, newId }, 'Engine: Automation duplicated');
        return this.toSessionDTO(newSession);
    }
    async archiveSession(sessionId) {
        const doc = await area_automation_model_1.AreaSessionModel.findByIdAndUpdate(sessionId, { $set: { status: 'archived', archivedAt: new Date() } }, { new: true });
        return doc ? this.toSessionDTO(doc) : null;
    }
    async stopAutomation(sessionId) {
        await area_queue_1.areaQueue.pauseProcessing(sessionId);
        const doc = await area_automation_model_1.AreaSessionModel.findById(sessionId);
        logger_1.logger.info({ sessionId }, 'Engine: Automation stop requested');
        return doc ? this.toSessionDTO(doc) : null;
    }
    async pauseAutomation(sessionId) {
        await area_queue_1.areaQueue.pauseProcessing(sessionId);
        const doc = await area_automation_model_1.AreaSessionModel.findById(sessionId);
        logger_1.logger.info({ sessionId }, 'Engine: Automation pause requested');
        return doc ? this.toSessionDTO(doc) : null;
    }
    async resumeAutomation(sessionId) {
        const session = await area_automation_model_1.AreaSessionModel.findById(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        const pendingCount = await area_automation_model_1.AreaJobModel.countDocuments({ sessionId, status: 'pending' });
        const failedCount = await area_automation_model_1.AreaJobModel.countDocuments({ sessionId, status: 'failed' });
        if (pendingCount === 0 && failedCount === 0) {
            throw new Error('No recoverable jobs found. All jobs are already completed.');
        }
        if (session.retryEnabled !== false && failedCount > 0) {
            await area_automation_model_1.AreaJobModel.updateMany({ sessionId, status: 'failed' }, {
                $set: {
                    status: 'pending',
                    progress: '',
                    startedAt: null,
                    completedAt: null,
                    failedReason: null,
                    currentStage: 'pending',
                },
            });
        }
        logger_1.logger.info({ sessionId, pendingCount, failedCount }, 'Engine: Resuming automation');
        await area_automation_model_1.AreaSessionModel.findByIdAndUpdate(sessionId, {
            $set: {
                status: 'running',
                completedAt: null,
                pausedAt: null,
                runningJobs: 0,
                currentStage: 'resuming',
                lastHeartbeat: new Date(),
                lastRunAt: new Date(),
            },
        });
        monitor_engine_1.monitorEngine.onSessionResumed(sessionId);
        await this.waitForQueueIdle(sessionId, 5000);
        setImmediate(() => {
            area_queue_1.areaQueue.startProcessing(sessionId).catch((err) => {
                logger_1.logger.error({ err: err instanceof Error ? err.message : String(err), sessionId }, 'Engine: Resume queue processing failed');
            });
        });
        const updatedSession = await area_automation_model_1.AreaSessionModel.findById(sessionId);
        if (!updatedSession) {
            throw new Error('Session not found after resume');
        }
        logger_1.logger.info({ sessionId }, 'Engine: Automation resumed');
        return this.toSessionDTO(updatedSession);
    }
    async restartAutomation(sessionId) {
        await area_queue_1.areaQueue.pauseProcessing(sessionId);
        await this.waitForQueueIdle(sessionId, 10000);
        await area_automation_model_1.AreaJobModel.updateMany({ sessionId }, {
            $set: {
                status: 'pending',
                progress: '',
                currentStage: '',
                startedAt: null,
                completedAt: null,
                failedReason: null,
                totalLeads: 0,
                savedLeads: 0,
                duplicates: 0,
                rejected: 0,
                attempts: 0,
                sourceResults: [],
            },
        });
        const doc = await area_automation_model_1.AreaSessionModel.findByIdAndUpdate(sessionId, {
            $set: {
                status: 'running',
                completedJobs: 0,
                failedJobs: 0,
                runningJobs: 0,
                skippedJobs: 0,
                totalLeads: 0,
                savedLeads: 0,
                duplicates: 0,
                rejected: 0,
                currentJobId: null,
                currentStage: 'starting',
                lastHeartbeat: new Date(),
                startedAt: new Date(),
                completedAt: null,
                pausedAt: null,
                lastRunAt: new Date(),
            },
        }, { new: true });
        if (doc) {
            monitor_engine_1.monitorEngine.onSessionResumed(sessionId);
            setImmediate(() => {
                area_queue_1.areaQueue.startProcessing(sessionId).catch((err) => {
                    logger_1.logger.error({ err: err instanceof Error ? err.message : String(err), sessionId }, 'Engine: Restart queue processing failed');
                });
            });
        }
        return doc ? this.toSessionDTO(doc) : null;
    }
    async getStats() {
        const [total, running, completed, failed, paused, draft, jobLeadResult] = await Promise.all([
            area_automation_model_1.AreaSessionModel.countDocuments(),
            area_automation_model_1.AreaSessionModel.countDocuments({ status: 'running' }),
            area_automation_model_1.AreaSessionModel.countDocuments({ status: 'completed' }),
            area_automation_model_1.AreaSessionModel.countDocuments({ status: 'failed' }),
            area_automation_model_1.AreaSessionModel.countDocuments({ status: 'paused' }),
            area_automation_model_1.AreaSessionModel.countDocuments({ status: 'draft' }),
            area_automation_model_1.AreaJobModel.aggregate([
                { $match: { status: 'completed' } },
                { $group: { _id: null, totalLeads: { $sum: '$totalLeads' } } },
            ]),
        ]);
        return {
            total,
            running,
            completed,
            failed,
            paused,
            draft,
            totalLeads: jobLeadResult[0]?.totalLeads || 0,
        };
    }
    async waitForQueueIdle(sessionId, timeoutMs) {
        const start = Date.now();
        while (area_queue_1.areaQueue.isProcessing(sessionId)) {
            if (Date.now() - start > timeoutMs) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 250));
        }
    }
    calculateSummary(session, jobs, totalJobCount) {
        const completedJobs = jobs.filter(j => j.status === 'completed').length;
        const failedJobs = jobs.filter(j => j.status === 'failed').length;
        const runningJobs = jobs.filter(j => j.status === 'running').length;
        const skippedJobs = jobs.filter(j => j.status === 'skipped').length;
        const pendingJobs = totalJobCount - completedJobs - failedJobs - runningJobs - skippedJobs;
        const totalLeads = jobs.reduce((sum, j) => sum + j.totalLeads, 0);
        const savedLeads = jobs.reduce((sum, j) => sum + (j.savedLeads || 0), 0);
        const duplicates = jobs.reduce((sum, j) => sum + (j.duplicates || 0), 0);
        const rejected = jobs.reduce((sum, j) => sum + (j.rejected || 0), 0);
        const processedJobs = completedJobs + failedJobs;
        const progressPercent = totalJobCount > 0 ? Math.round((processedJobs / totalJobCount) * 100) : 0;
        const startedAtMs = session.startedAt ? new Date(session.startedAt).getTime() : Date.now();
        const elapsedMs = Date.now() - startedAtMs;
        const avgJobMs = processedJobs > 0 ? elapsedMs / processedJobs : 0;
        const remainingJobs = Math.max(0, pendingJobs) + runningJobs;
        const etaMs = avgJobMs > 0 && remainingJobs > 0 ? Math.round(avgJobMs * remainingJobs) : null;
        const activeJob = jobs.find(j => j.status === 'running') || null;
        return {
            totalJobs: totalJobCount,
            completedJobs,
            failedJobs,
            runningJobs,
            pendingJobs: Math.max(0, pendingJobs),
            skippedJobs,
            totalLeads,
            savedLeads,
            duplicates,
            rejected,
            businessTypesCount: session.businessTypes.length,
            progressPercent,
            elapsedMs,
            etaMs,
            currentCity: activeJob?.city || null,
            currentArea: activeJob?.area || null,
            currentStage: activeJob?.currentStage || session.currentStage || null,
        };
    }
    toSessionDTO(doc) {
        const d = doc;
        return {
            id: (d._id || d.id),
            name: d.name || '',
            businessTypes: d.businessTypes,
            state: d.state,
            cities: d.cities,
            country: d.country || '',
            sources: d.sources,
            status: d.status,
            totalJobs: d.totalJobs,
            completedJobs: d.completedJobs,
            failedJobs: d.failedJobs,
            runningJobs: d.runningJobs,
            skippedJobs: d.skippedJobs,
            totalLeads: d.totalLeads,
            savedLeads: d.savedLeads || 0,
            duplicates: d.duplicates || 0,
            rejected: d.rejected || 0,
            currentJobId: d.currentJobId || null,
            currentStage: d.currentStage || '',
            lastHeartbeat: d.lastHeartbeat ? new Date(d.lastHeartbeat).toISOString() : null,
            startedAt: d.startedAt ? new Date(d.startedAt).toISOString() : null,
            completedAt: d.completedAt ? new Date(d.completedAt).toISOString() : null,
            pausedAt: d.pausedAt ? new Date(d.pausedAt).toISOString() : null,
            archivedAt: d.archivedAt ? new Date(d.archivedAt).toISOString() : null,
            retryCount: d.retryCount || 0,
            lastRunAt: d.lastRunAt ? new Date(d.lastRunAt).toISOString() : null,
            maxLeads: d.maxLeads || 100,
            concurrency: d.concurrency || 2,
            retryEnabled: d.retryEnabled !== false,
            dedupEnabled: d.dedupEnabled !== false,
            aiAuditEnabled: d.aiAuditEnabled || false,
            autoOutreach: d.autoOutreach || false,
            autoReport: d.autoReport || false,
            autoWhatsApp: d.autoWhatsApp || false,
            schedule: d.schedule || '',
            frequency: d.frequency || 'once',
            createdAt: new Date(d.createdAt).toISOString(),
            updatedAt: new Date(d.updatedAt).toISOString(),
        };
    }
    toJobDTO(doc) {
        const d = doc;
        return {
            id: (d._id || d.id),
            sessionId: d.sessionId,
            businessType: d.businessType,
            state: d.state,
            city: d.city,
            area: d.area || undefined,
            country: d.country || '',
            sources: d.sources,
            status: d.status,
            progress: d.progress,
            currentStage: d.currentStage || '',
            totalLeads: d.totalLeads,
            savedLeads: d.savedLeads || 0,
            duplicates: d.duplicates || 0,
            rejected: d.rejected || 0,
            attempts: d.attempts || 0,
            sourceResults: d.sourceResults,
            startedAt: d.startedAt ? new Date(d.startedAt).toISOString() : null,
            completedAt: d.completedAt ? new Date(d.completedAt).toISOString() : null,
            failedReason: d.failedReason,
            queuePosition: d.queuePosition,
            totalJobs: d.totalJobs,
            createdAt: new Date(d.createdAt).toISOString(),
            updatedAt: new Date(d.updatedAt).toISOString(),
        };
    }
}
exports.AreaAutomationEngine = AreaAutomationEngine;
exports.areaAutomationEngine = new AreaAutomationEngine();
//# sourceMappingURL=area-automation-engine.js.map