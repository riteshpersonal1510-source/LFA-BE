"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineStage = void 0;
exports.createPipeline = createPipeline;
exports.startStage = startStage;
exports.completeStage = completeStage;
exports.failStage = failStage;
exports.incrementRetry = incrementRetry;
exports.getPipeline = getPipeline;
exports.getAllPipelines = getAllPipelines;
exports.removePipeline = removePipeline;
exports.cleanupOldPipelines = cleanupOldPipelines;
const logger_1 = require("../utils/logger");
const socket_manager_1 = require("../modules/automation-monitor/socket-manager");
var PipelineStage;
(function (PipelineStage) {
    PipelineStage["DISCOVERY"] = "DISCOVERY";
    PipelineStage["EXTRACTION"] = "EXTRACTION";
    PipelineStage["WEBSITE_CRAWL"] = "WEBSITE_CRAWL";
    PipelineStage["ENRICHMENT"] = "ENRICHMENT";
    PipelineStage["MONGODB"] = "MONGODB";
    PipelineStage["API"] = "API";
    PipelineStage["FRONTEND"] = "FRONTEND";
})(PipelineStage || (exports.PipelineStage = PipelineStage = {}));
const activePipelines = new Map();
function now() {
    return new Date().toISOString();
}
function createStage(stage) {
    return {
        stage,
        status: 'pending',
        startedAt: '',
        retries: 0,
    };
}
function createPipeline(sessionId, keyword) {
    const pipeline = {
        sessionId,
        keyword,
        stages: {
            [PipelineStage.DISCOVERY]: createStage(PipelineStage.DISCOVERY),
            [PipelineStage.EXTRACTION]: createStage(PipelineStage.EXTRACTION),
            [PipelineStage.WEBSITE_CRAWL]: createStage(PipelineStage.WEBSITE_CRAWL),
            [PipelineStage.ENRICHMENT]: createStage(PipelineStage.ENRICHMENT),
            [PipelineStage.MONGODB]: createStage(PipelineStage.MONGODB),
            [PipelineStage.API]: createStage(PipelineStage.API),
            [PipelineStage.FRONTEND]: createStage(PipelineStage.FRONTEND),
        },
        overallStatus: 'running',
        startedAt: now(),
    };
    activePipelines.set(sessionId, pipeline);
    emitPipelineUpdate(sessionId, pipeline);
    return pipeline;
}
function startStage(sessionId, stage) {
    const pipeline = activePipelines.get(sessionId);
    if (!pipeline)
        return;
    const record = pipeline.stages[stage];
    record.status = 'running';
    record.startedAt = now();
    logger_1.logger.info({ sessionId, stage, keyword: pipeline.keyword }, 'Pipeline: Stage started');
    emitStageUpdate(sessionId, stage, record);
}
function completeStage(sessionId, stage, metadata) {
    const pipeline = activePipelines.get(sessionId);
    if (!pipeline)
        return;
    const record = pipeline.stages[stage];
    record.status = 'completed';
    record.completedAt = now();
    record.durationMs = new Date(record.completedAt).getTime() - new Date(record.startedAt).getTime();
    if (metadata)
        record.metadata = metadata;
    logger_1.logger.info({
        sessionId, stage, keyword: pipeline.keyword,
        durationMs: record.durationMs,
    }, 'Pipeline: Stage completed');
    emitStageUpdate(sessionId, stage, record);
    checkPipelineComplete(sessionId, pipeline);
}
function failStage(sessionId, stage, error) {
    const pipeline = activePipelines.get(sessionId);
    if (!pipeline)
        return;
    const record = pipeline.stages[stage];
    record.status = 'failed';
    record.completedAt = now();
    record.error = error;
    record.durationMs = new Date(record.completedAt).getTime() - new Date(record.startedAt).getTime();
    logger_1.logger.error({ sessionId, stage, error, keyword: pipeline.keyword }, 'Pipeline: Stage failed');
    emitStageUpdate(sessionId, stage, record);
}
function incrementRetry(sessionId, stage) {
    const pipeline = activePipelines.get(sessionId);
    if (!pipeline)
        return;
    pipeline.stages[stage].retries++;
    logger_1.logger.info({
        sessionId, stage, retries: pipeline.stages[stage].retries,
    }, 'Pipeline: Stage retry incremented');
}
function getPipeline(sessionId) {
    return activePipelines.get(sessionId);
}
function getAllPipelines() {
    return Array.from(activePipelines.values());
}
function removePipeline(sessionId) {
    activePipelines.delete(sessionId);
}
function cleanupOldPipelines(maxAgeMs = 3600000) {
    const cutoff = Date.now() - maxAgeMs;
    let removed = 0;
    for (const [sessionId, pipeline] of activePipelines) {
        if (new Date(pipeline.startedAt).getTime() < cutoff) {
            activePipelines.delete(sessionId);
            removed++;
        }
    }
    return removed;
}
function checkPipelineComplete(sessionId, pipeline) {
    const stages = Object.values(pipeline.stages);
    const allDone = stages.every(s => s.status === 'completed' || s.status === 'failed' || s.status === 'skipped');
    if (!allDone)
        return;
    const hasFailures = stages.some(s => s.status === 'failed');
    pipeline.overallStatus = hasFailures ? 'partial' : 'completed';
    pipeline.completedAt = now();
    if (hasFailures) {
        pipeline.error = stages
            .filter(s => s.status === 'failed')
            .map(s => `[${s.stage}] ${s.error}`)
            .join('; ');
    }
    logger_1.logger.info({
        sessionId,
        overallStatus: pipeline.overallStatus,
        keyword: pipeline.keyword,
        stages: stages.map(s => `${s.stage}=${s.status}`).join(', '),
    }, 'Pipeline: Complete');
    emitPipelineUpdate(sessionId, pipeline);
}
function emitStageUpdate(sessionId, stage, record) {
    (0, socket_manager_1.emitToSession)(sessionId, 'pipeline:stage', {
        type: 'pipeline:stage',
        sessionId,
        stage,
        status: record.status,
        durationMs: record.durationMs,
        error: record.error,
        timestamp: now(),
    });
    (0, socket_manager_1.emitToAll)('pipeline:stage:global', {
        sessionId,
        stage,
        status: record.status,
        keyword: activePipelines.get(sessionId)?.keyword,
        timestamp: now(),
    });
}
function emitPipelineUpdate(sessionId, pipeline) {
    (0, socket_manager_1.emitToSession)(sessionId, 'pipeline:update', {
        type: 'pipeline:update',
        sessionId,
        overallStatus: pipeline.overallStatus,
        stages: Object.entries(pipeline.stages).map(([stage, record]) => ({
            stage,
            status: record.status,
            durationMs: record.durationMs,
            error: record.error,
        })),
        timestamp: now(),
    });
}
//# sourceMappingURL=pipeline-tracker.js.map