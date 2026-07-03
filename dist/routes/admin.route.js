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
const express_1 = require("express");
const search_queue_service_1 = require("../services/search-queue.service");
const logger_1 = require("../utils/logger");
const api_response_1 = require("../utils/api-response");
const router = (0, express_1.Router)();
router.post('/search/reset', async (req, res) => {
    const deleteCompleted = req.query.completed === 'true';
    logger_1.logger.info({ deleteCompleted }, '[ADMIN] Search queue reset requested');
    try {
        const summary = await search_queue_service_1.searchCleanup.resetAll(deleteCompleted);
        logger_1.logger.info({
            sessionsRemoved: summary.sessionsRemoved,
            analyticsRemoved: summary.analyticsRemoved,
            queueReset: summary.queueReset,
            browserPoolRecreated: summary.browserPoolRecreated,
            orphanLeads: summary.orphanLeads,
            errors: summary.errors.length,
        }, '[ADMIN] Search queue reset completed');
        return api_response_1.APIResponse.success(res, summary, 'Search queue reset completed');
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger_1.logger.error({ err: msg }, '[ADMIN] Search queue reset failed');
        return api_response_1.APIResponse.error(res, 'Reset failed: ' + msg, undefined, 500);
    }
});
router.get('/search/status', async (_req, res) => {
    const { searchQueue } = await Promise.resolve().then(() => __importStar(require('../services/search-queue.service')));
    const { searchStatus } = await Promise.resolve().then(() => __importStar(require('../services/search-status.service')));
    const { browserPool } = await Promise.resolve().then(() => __importStar(require('../services/browser-pool.service')));
    const { browserManager } = await Promise.resolve().then(() => __importStar(require('../core/scraper-engine/browser-manager')));
    const queueStatus = {
        activeSessions: searchQueue.activeSessions?.size || 0,
        pendingQueue: searchQueue.queue?.length || 0,
        lockedSessions: searchQueue.sessionLocks?.size || 0,
        abortControllers: searchQueue.abortControllers?.size || 0,
    };
    const statusStatus = {
        inMemorySessions: searchStatus.sessions?.size || 0,
        emitTimers: searchStatus.emitTimers?.size || 0,
        persistTimers: searchStatus.persistTimers?.size || 0,
    };
    const browserPoolStatus = browserPool.getStatus();
    const browserManagerStatus = browserManager.getStatus();
    return api_response_1.APIResponse.success(res, {
        queue: queueStatus,
        status: statusStatus,
        browserPool: browserPoolStatus,
        browserManager: browserManagerStatus,
    }, 'Search system status');
});
exports.default = router;
//# sourceMappingURL=admin.route.js.map