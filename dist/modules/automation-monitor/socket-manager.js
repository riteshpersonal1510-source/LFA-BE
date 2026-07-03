"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocketManager = initSocketManager;
exports.getSocketIO = getSocketIO;
exports.emitToSession = emitToSession;
exports.emitToAll = emitToAll;
exports.emitJobStarted = emitJobStarted;
exports.emitJobProgress = emitJobProgress;
exports.emitJobCompleted = emitJobCompleted;
exports.emitJobFailed = emitJobFailed;
exports.emitSessionStatus = emitSessionStatus;
exports.emitLogAdded = emitLogAdded;
exports.emitAutomationCreated = emitAutomationCreated;
exports.emitAutomationStarted = emitAutomationStarted;
exports.emitSessionProgress = emitSessionProgress;
exports.emitLeadRejected = emitLeadRejected;
exports.emitSearchStart = emitSearchStart;
exports.emitSearchProgress = emitSearchProgress;
exports.emitSearchLog = emitSearchLog;
exports.emitSearchStage = emitSearchStage;
exports.emitSearchHeartbeat = emitSearchHeartbeat;
exports.emitLeadFound = emitLeadFound;
exports.emitSourceUpdate = emitSourceUpdate;
exports.emitSearchCompleted = emitSearchCompleted;
exports.emitSearchStopped = emitSearchStopped;
exports.emitSearchTimeout = emitSearchTimeout;
exports.emitSearchNoResults = emitSearchNoResults;
exports.emitSearchGoogleBlocked = emitSearchGoogleBlocked;
exports.emitSearchHistoryUpdate = emitSearchHistoryUpdate;
exports.emitSearchError = emitSearchError;
exports.emitSearchRecovered = emitSearchRecovered;
exports.emitLeadSaved = emitLeadSaved;
exports.emitDuplicateRemoved = emitDuplicateRemoved;
exports.emitLeadEnrichmentStarted = emitLeadEnrichmentStarted;
exports.emitLeadEnrichmentStep = emitLeadEnrichmentStep;
exports.emitLeadEnrichmentCompleted = emitLeadEnrichmentCompleted;
exports.emitLeadEnrichmentFailed = emitLeadEnrichmentFailed;
exports.emitEmailDiscoveryUpdate = emitEmailDiscoveryUpdate;
exports.emitLeadBusinessFound = emitLeadBusinessFound;
exports.emitLeadBusinessProcessing = emitLeadBusinessProcessing;
exports.emitLeadBusinessAnalyzing = emitLeadBusinessAnalyzing;
exports.emitLeadBusinessCompleted = emitLeadBusinessCompleted;
const socket_io_1 = require("socket.io");
const logger_1 = require("../../utils/logger");
let io = null;
const SESSION_NS = '/automation-monitor';
function initSocketManager(httpServer) {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: true,
            credentials: true,
            allowedHeaders: [
                'Content-Type',
                'Authorization',
                'Accept',
                'ngrok-skip-browser-warning',
            ],
            methods: ['GET', 'POST', 'OPTIONS'],
        },
        path: '/ws',
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000,
        connectTimeout: 30000,
        allowEIO3: true,
        cookie: {
            name: 'io',
            httpOnly: true,
            sameSite: 'none',
            secure: true,
        },
    });
    const sessionNamespace = io.of(SESSION_NS);
    sessionNamespace.on('connection', (socket) => {
        const sessionId = socket.handshake.query.sessionId;
        const clientOrigin = socket.handshake.headers.origin || 'unknown';
        logger_1.logger.debug({
            sessionId,
            origin: clientOrigin,
            transport: socket.conn.transport.name,
            address: socket.handshake.address,
        }, `[Socket.IO] Client connected`);
        if (sessionId) {
            socket.join(`session:${sessionId}`);
        }
        socket.on('subscribe', (id) => {
            socket.join(`session:${id}`);
            logger_1.logger.debug({ sessionId: id }, 'Socket: Client subscribed to session');
        });
        socket.on('unsubscribe', (id) => {
            socket.leave(`session:${id}`);
        });
        socket.on('disconnect', (reason) => {
            logger_1.logger.debug({ sessionId, reason }, 'Socket: Client disconnected');
        });
    });
    logger_1.logger.info('Socket.IO initialized on /ws/* with unrestricted CORS');
    return io;
}
function getSocketIO() {
    return io;
}
function emitToSession(sessionId, event, data) {
    if (!io)
        return;
    const sessionNamespace = io.of(SESSION_NS);
    sessionNamespace.to(`session:${sessionId}`).emit(event, data);
}
function emitToAll(event, data) {
    if (!io)
        return;
    const sessionNamespace = io.of(SESSION_NS);
    sessionNamespace.emit(event, data);
}
function emitJobStarted(sessionId, data) {
    emitToSession(sessionId, 'job:started', {
        type: 'job:started',
        sessionId,
        timestamp: new Date().toISOString(),
        data,
    });
}
function emitJobProgress(sessionId, data) {
    emitToSession(sessionId, 'job:progress', {
        type: 'job:progress',
        sessionId,
        timestamp: new Date().toISOString(),
        data,
    });
}
function emitJobCompleted(sessionId, data) {
    emitToSession(sessionId, 'job:completed', {
        type: 'job:completed',
        sessionId,
        timestamp: new Date().toISOString(),
        data,
    });
}
function emitJobFailed(sessionId, data) {
    emitToSession(sessionId, 'job:failed', {
        type: 'job:failed',
        sessionId,
        timestamp: new Date().toISOString(),
        data,
    });
}
function emitSessionStatus(sessionId, status, data) {
    emitToSession(sessionId, 'session:status', {
        type: 'session:status',
        sessionId,
        timestamp: new Date().toISOString(),
        status,
        data: data || {},
    });
}
function emitLogAdded(sessionId, logEntry) {
    emitToSession(sessionId, 'log:added', {
        type: 'log:added',
        sessionId,
        timestamp: new Date().toISOString(),
        data: logEntry,
    });
}
function emitAutomationCreated(sessionId, data) {
    emitToSession(sessionId, 'automation:created', {
        type: 'automation:created',
        sessionId,
        timestamp: new Date().toISOString(),
        data,
    });
}
function emitAutomationStarted(sessionId) {
    emitToSession(sessionId, 'automation:started', {
        type: 'automation:started',
        sessionId,
        timestamp: new Date().toISOString(),
        data: {},
    });
}
function emitSessionProgress(sessionId, data) {
    emitToSession(sessionId, 'session:progress', {
        type: 'session:progress',
        sessionId,
        timestamp: new Date().toISOString(),
        data,
    });
}
function emitLeadRejected(sessionId, data) {
    emitToSession(sessionId, 'lead:rejected', {
        type: 'lead:rejected',
        sessionId,
        timestamp: new Date().toISOString(),
        data,
    });
}
function emitSearchStart(sessionId, data) {
    emitToAll('search:start', {
        type: 'search:start',
        sessionId,
        timestamp: new Date().toISOString(),
        data,
    });
}
function emitSearchProgress(sessionId, data) {
    emitToAll('search:progress', {
        searchSessionId: sessionId,
        currentSource: data.currentSource,
        foundCount: data.foundCount,
        savedCount: data.savedCount,
        duplicateCount: data.duplicateCount,
        failedCount: data.failedCount,
        progress: data.progress,
        currentLead: data.currentLead,
        currentStage: data.currentStage,
        currentUrl: data.currentUrl,
        eta: data.eta,
        totalProcessed: data.totalProcessed,
        updatedAt: data.updatedAt,
    });
}
function emitSearchLog(sessionId, entry) {
    emitToSession(sessionId, 'log:added', {
        type: 'log:added',
        sessionId,
        timestamp: entry.timestamp,
        data: entry,
    });
}
function emitSearchStage(sessionId, stage) {
    emitToSession(sessionId, 'search:stage', {
        type: 'search:stage',
        sessionId,
        timestamp: new Date().toISOString(),
        data: { stage },
    });
}
function emitSearchHeartbeat(sessionId, data) {
    emitToSession(sessionId, 'heartbeat', {
        type: 'heartbeat',
        sessionId,
        timestamp: data.timestamp,
        data,
    });
}
function emitLeadFound(sessionId, data) {
    emitToSession(sessionId, 'lead:found', {
        type: 'lead:found',
        sessionId,
        timestamp: new Date().toISOString(),
        data,
    });
}
function emitSourceUpdate(sessionId, data) {
    emitToSession(sessionId, 'source:update', {
        type: 'source:update',
        sessionId,
        timestamp: new Date().toISOString(),
        data,
    });
}
function emitSearchCompleted(sessionId, data) {
    emitToAll('search:completed', {
        type: 'search:completed',
        sessionId,
        timestamp: new Date().toISOString(),
        data,
    });
}
function emitSearchStopped(sessionId) {
    emitToAll('search:stopped', {
        type: 'search:stopped',
        sessionId,
        timestamp: new Date().toISOString(),
        data: {},
    });
}
function emitSearchTimeout(sessionId, data) {
    emitToAll('search:timeout', {
        type: 'search:timeout',
        sessionId,
        timestamp: new Date().toISOString(),
        data,
    });
}
function emitSearchNoResults(sessionId, data) {
    emitToAll('search:no-results', {
        type: 'search:no-results',
        sessionId,
        timestamp: new Date().toISOString(),
        data,
    });
}
function emitSearchGoogleBlocked(sessionId, data) {
    emitToAll('search:google-blocked', {
        type: 'search:google-blocked',
        sessionId,
        timestamp: new Date().toISOString(),
        data,
    });
}
function emitSearchHistoryUpdate(sessionId, data) {
    emitToAll('search:history-update', {
        type: 'search:history-update',
        sessionId,
        timestamp: new Date().toISOString(),
        data,
    });
}
function emitSearchError(sessionId, data) {
    emitToAll('search:error', {
        type: 'search:error',
        sessionId,
        timestamp: new Date().toISOString(),
        data,
    });
}
function emitSearchRecovered(sessionId, data) {
    emitToSession(sessionId, 'search:recovered', {
        type: 'search:recovered',
        sessionId,
        timestamp: new Date().toISOString(),
        data,
    });
}
function emitLeadSaved(sessionId, data) {
    emitToSession(sessionId, 'lead:saved', {
        type: 'lead:saved',
        sessionId,
        timestamp: new Date().toISOString(),
        data,
    });
}
function emitDuplicateRemoved(sessionId, data) {
    emitToSession(sessionId, 'duplicate:removed', {
        type: 'duplicate:removed',
        sessionId,
        timestamp: new Date().toISOString(),
        data,
    });
}
function emitLeadEnrichmentStarted(leadId) {
    if (!io)
        return;
    io.emit('lead:enrichment:started', {
        type: 'lead:enrichment:started',
        leadId,
        timestamp: new Date().toISOString(),
    });
}
function emitLeadEnrichmentStep(leadId, data) {
    if (!io)
        return;
    io.emit('lead:enrichment:step', {
        type: 'lead:enrichment:step',
        leadId,
        timestamp: new Date().toISOString(),
        data,
    });
}
function emitLeadEnrichmentCompleted(leadId, data) {
    if (!io)
        return;
    io.emit('lead:enrichment:completed', {
        type: 'lead:enrichment:completed',
        leadId,
        timestamp: new Date().toISOString(),
        data,
    });
}
function emitLeadEnrichmentFailed(leadId, data) {
    if (!io)
        return;
    io.emit('lead:enrichment:failed', {
        type: 'lead:enrichment:failed',
        leadId,
        timestamp: new Date().toISOString(),
        data,
    });
}
function emitEmailDiscoveryUpdate(leadId, data) {
    if (!io)
        return;
    io.emit('email:discovery:update', {
        type: 'email:discovery:update',
        leadId,
        timestamp: new Date().toISOString(),
        data,
    });
}
function emitLeadBusinessFound(sessionId, data) {
    emitToSession(sessionId, 'lead:business:found', {
        type: 'lead:business:found',
        sessionId,
        timestamp: new Date().toISOString(),
        data,
    });
}
function emitLeadBusinessProcessing(sessionId, data) {
    emitToSession(sessionId, 'lead:business:processing', {
        type: 'lead:business:processing',
        sessionId,
        timestamp: new Date().toISOString(),
        data,
    });
}
function emitLeadBusinessAnalyzing(sessionId, data) {
    emitToSession(sessionId, 'lead:business:analyzing', {
        type: 'lead:business:analyzing',
        sessionId,
        timestamp: new Date().toISOString(),
        data,
    });
}
function emitLeadBusinessCompleted(sessionId, data) {
    emitToSession(sessionId, 'lead:business:completed', {
        type: 'lead:business:completed',
        sessionId,
        timestamp: new Date().toISOString(),
        data,
    });
}
//# sourceMappingURL=socket-manager.js.map