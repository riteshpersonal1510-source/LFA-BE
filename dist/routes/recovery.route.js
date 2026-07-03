"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const api_response_1 = require("../utils/api-response");
const recovery_1 = require("../recovery");
const recovery_orchestrator_1 = require("../recovery/recovery-orchestrator");
const pipeline_tracker_1 = require("../recovery/pipeline-tracker");
const router = (0, express_1.Router)();
router.get('/health', async (_req, res) => {
    const report = await (0, recovery_1.getHealthReport)();
    const statusCode = report.status === 'healthy' ? 200 : report.status === 'degraded' ? 200 : 503;
    res.status(statusCode).json({ success: true, data: report });
});
router.get('/dashboard', async (req, res) => {
    const days = parseInt(req.query.days) || 7;
    const metrics = await (0, recovery_1.getDashboardMetrics)(days);
    api_response_1.APIResponse.success(res, metrics, 'Dashboard metrics');
});
router.get('/pipelines', (_req, res) => {
    const pipelines = (0, pipeline_tracker_1.getAllPipelines)();
    api_response_1.APIResponse.success(res, pipelines, 'Active pipelines');
});
router.get('/pipelines/:sessionId', (req, res) => {
    const pipeline = recovery_orchestrator_1.recoveryOrchestrator.getPipeline(req.params.sessionId);
    if (!pipeline) {
        return api_response_1.APIResponse.error(res, 'Pipeline not found', undefined, 404);
    }
    return api_response_1.APIResponse.success(res, pipeline, 'Pipeline found');
});
router.get('/queue', (_req, res) => {
    const status = recovery_orchestrator_1.recoveryOrchestrator.getQueueStatus();
    api_response_1.APIResponse.success(res, status, 'Queue status');
});
router.post('/queue/pause', (_req, res) => {
    recovery_orchestrator_1.recoveryOrchestrator.pauseQueue();
    api_response_1.APIResponse.success(res, { paused: true }, 'Queue paused');
});
router.post('/queue/resume', (_req, res) => {
    recovery_orchestrator_1.recoveryOrchestrator.resumeQueue();
    api_response_1.APIResponse.success(res, { paused: false }, 'Queue resumed');
});
router.post('/queue/clear', (_req, res) => {
    const count = recovery_orchestrator_1.recoveryOrchestrator.clearQueue();
    api_response_1.APIResponse.success(res, { cleared: count }, 'Queue cleared');
});
router.get('/source-metrics', async (req, res) => {
    const days = parseInt(req.query.days) || 7;
    const metrics = await recovery_orchestrator_1.recoveryOrchestrator.getSourceMetrics(days);
    api_response_1.APIResponse.success(res, metrics, 'Source metrics');
});
router.get('/search-stats', async (req, res) => {
    const days = parseInt(req.query.days) || 7;
    const stats = await recovery_orchestrator_1.recoveryOrchestrator.getSearchHistoryStats(days);
    api_response_1.APIResponse.success(res, stats, 'Search statistics');
});
exports.default = router;
//# sourceMappingURL=recovery.route.js.map