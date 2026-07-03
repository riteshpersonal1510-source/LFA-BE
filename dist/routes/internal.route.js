"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const socket_manager_1 = require("../modules/automation-monitor/socket-manager");
const search_status_service_1 = require("../services/search-status.service");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
router.post('/emit', (req, res) => {
    const { event, sessionId, data } = req.body;
    if (!event) {
        return res.status(400).json({ error: 'event is required' });
    }
    try {
        if (event === 'search:progress' && sessionId) {
            (0, socket_manager_1.emitToSession)(sessionId, 'search:progress', data);
        }
        else if (event === 'search:live-lead' && sessionId) {
            search_status_service_1.searchStatus.addLiveLead(sessionId, data.companyName, data.source);
            search_status_service_1.searchStatus.incrementFound(sessionId);
        }
        else if (event === 'search:saved-lead' && sessionId) {
            search_status_service_1.searchStatus.incrementSaved(sessionId, 1);
            (0, socket_manager_1.emitToSession)(sessionId, 'lead-saved', data);
        }
        else if (sessionId) {
            (0, socket_manager_1.emitToSession)(sessionId, event, data);
        }
        else {
            (0, socket_manager_1.emitToAll)(event, data);
        }
        return res.json({ success: true });
    }
    catch (err) {
        logger_1.logger.error({ err: err.message }, 'Failed to process internal emit');
        return res.status(500).json({ error: err.message });
    }
});
exports.default = router;
//# sourceMappingURL=internal.route.js.map