"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const monitor_controller_1 = require("./monitor.controller");
const router = (0, express_1.Router)();
router.get('/:sessionId/logs', (req, res, next) => monitor_controller_1.monitorController.getLogs(req, res, next));
router.get('/:sessionId/live', (req, res, next) => monitor_controller_1.monitorController.getLiveStatus(req, res, next));
router.get('/:sessionId/stats', (req, res, next) => monitor_controller_1.monitorController.getStats(req, res, next));
router.get('/:sessionId/memory-logs', (req, res, next) => monitor_controller_1.monitorController.getMemoryLogs(req, res, next));
router.delete('/:sessionId/memory-logs', (req, res, next) => monitor_controller_1.monitorController.clearMemoryLogs(req, res, next));
exports.default = router;
//# sourceMappingURL=monitor.routes.js.map