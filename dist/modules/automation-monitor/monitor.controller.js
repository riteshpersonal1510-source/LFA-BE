"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.monitorController = exports.MonitorController = void 0;
const monitor_engine_1 = require("./monitor-engine");
const api_response_1 = require("../../utils/api-response");
class MonitorController {
    async getLogs(req, res, _next) {
        try {
            const { sessionId } = req.params;
            const limit = parseInt(req.query.limit, 10) || 200;
            const logs = await monitor_engine_1.monitorEngine.getLogs(sessionId, limit);
            api_response_1.APIResponse.success(res, logs, 'Execution logs fetched');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            api_response_1.APIResponse.error(res, `Failed to fetch logs: ${message}`);
        }
    }
    async getLiveStatus(req, res, _next) {
        try {
            const { sessionId } = req.params;
            const status = await monitor_engine_1.monitorEngine.getLiveStatus(sessionId);
            if (!status) {
                api_response_1.APIResponse.error(res, 'Session not found', null, 404);
                return;
            }
            api_response_1.APIResponse.success(res, status, 'Live status fetched');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            api_response_1.APIResponse.error(res, `Failed to fetch live status: ${message}`);
        }
    }
    async getStats(req, res, _next) {
        try {
            const { sessionId } = req.params;
            const stats = await monitor_engine_1.monitorEngine.getStats(sessionId);
            api_response_1.APIResponse.success(res, stats, 'Monitor stats fetched');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            api_response_1.APIResponse.error(res, `Failed to fetch stats: ${message}`);
        }
    }
    async getMemoryLogs(req, res, _next) {
        try {
            const { sessionId } = req.params;
            const logs = monitor_engine_1.monitorEngine.getMemoryLogs(sessionId);
            api_response_1.APIResponse.success(res, logs, 'Memory logs fetched');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            api_response_1.APIResponse.error(res, `Failed to fetch memory logs: ${message}`);
        }
    }
    async clearMemoryLogs(req, res, _next) {
        try {
            const { sessionId } = req.params;
            monitor_engine_1.monitorEngine.clearMemoryLogs(sessionId);
            api_response_1.APIResponse.success(res, null, 'Memory logs cleared');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            api_response_1.APIResponse.error(res, `Failed to clear memory logs: ${message}`);
        }
    }
}
exports.MonitorController = MonitorController;
exports.monitorController = new MonitorController();
//# sourceMappingURL=monitor.controller.js.map