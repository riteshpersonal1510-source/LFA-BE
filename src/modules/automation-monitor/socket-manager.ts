import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { logger } from '../../utils/logger';

let io: Server | null = null;

const SESSION_NS = '/automation-monitor';

export function initSocketManager(httpServer: HTTPServer): Server {
  io = new Server(httpServer, {
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

  sessionNamespace.on('connection', (socket: Socket) => {
    const sessionId = socket.handshake.query.sessionId as string;
    const clientOrigin = socket.handshake.headers.origin || 'unknown';

    logger.debug({
      sessionId,
      origin: clientOrigin,
      transport: socket.conn.transport.name,
      address: socket.handshake.address,
    }, `[Socket.IO] Client connected`);

    if (sessionId) {
      socket.join(`session:${sessionId}`);
    }

    socket.on('subscribe', (id: string) => {
      socket.join(`session:${id}`);
      logger.debug({ sessionId: id }, 'Socket: Client subscribed to session');
    });

    socket.on('unsubscribe', (id: string) => {
      socket.leave(`session:${id}`);
    });

    socket.on('disconnect', (reason) => {
      logger.debug({ sessionId, reason }, 'Socket: Client disconnected');
    });
  });

  logger.info('Socket.IO initialized on /ws/* with unrestricted CORS');
  return io;
}

export function getSocketIO(): Server | null {
  return io;
}

export function emitToSession(sessionId: string, event: string, data: unknown): void {
  if (!io) return;
  const sessionNamespace = io.of(SESSION_NS);
  sessionNamespace.to(`session:${sessionId}`).emit(event, data);
}

export function emitToAll(event: string, data: unknown): void {
  if (!io) return;
  const sessionNamespace = io.of(SESSION_NS);
  sessionNamespace.emit(event, data);
}

export function emitJobStarted(sessionId: string, data: {
  jobId: string; area: string; city: string; businessType: string;
  sources: string[]; queuePosition: number; totalJobs: number;
}): void {
  emitToSession(sessionId, 'job:started', {
    type: 'job:started',
    sessionId,
    timestamp: new Date().toISOString(),
    data,
  });
}

export function emitJobProgress(sessionId: string, data: {
  jobId: string; area: string; city: string; progress: string;
  totalLeads?: number; currentStage?: string;
  sourceResults?: Array<{ source: string; totalStored: number }>;
}): void {
  emitToSession(sessionId, 'job:progress', {
    type: 'job:progress',
    sessionId,
    timestamp: new Date().toISOString(),
    data,
  });
}

export function emitJobCompleted(sessionId: string, data: {
  jobId: string; area: string; city: string; totalLeads: number;
  duration: number; sources: string[];
}): void {
  emitToSession(sessionId, 'job:completed', {
    type: 'job:completed',
    sessionId,
    timestamp: new Date().toISOString(),
    data,
  });
}

export function emitJobFailed(sessionId: string, data: {
  jobId: string; area: string; city: string; error: string;
  duration: number;
}): void {
  emitToSession(sessionId, 'job:failed', {
    type: 'job:failed',
    sessionId,
    timestamp: new Date().toISOString(),
    data,
  });
}

export function emitSessionStatus(sessionId: string, status: string, data?: Record<string, unknown>): void {
  emitToSession(sessionId, 'session:status', {
    type: 'session:status',
    sessionId,
    timestamp: new Date().toISOString(),
    status,
    data: data || {},
  });
}

export function emitLogAdded(sessionId: string, logEntry: { timestamp: string; message: string; level: string }): void {
  emitToSession(sessionId, 'log:added', {
    type: 'log:added',
    sessionId,
    timestamp: new Date().toISOString(),
    data: logEntry,
  });
}

export function emitAutomationCreated(sessionId: string, data: { name: string }): void {
  emitToSession(sessionId, 'automation:created', {
    type: 'automation:created',
    sessionId,
    timestamp: new Date().toISOString(),
    data,
  });
}

export function emitAutomationStarted(sessionId: string): void {
  emitToSession(sessionId, 'automation:started', {
    type: 'automation:started',
    sessionId,
    timestamp: new Date().toISOString(),
    data: {},
  });
}

export function emitSessionProgress(sessionId: string, data: Record<string, unknown>): void {
  emitToSession(sessionId, 'session:progress', {
    type: 'session:progress',
    sessionId,
    timestamp: new Date().toISOString(),
    data,
  });
}

export function emitLeadRejected(sessionId: string, data: {
  businessName: string; totalRejected: number;
}): void {
  emitToSession(sessionId, 'lead:rejected', {
    type: 'lead:rejected',
    sessionId,
    timestamp: new Date().toISOString(),
    data,
  });
}

export function emitSearchStart(sessionId: string, data: {
  keyword: string; location: string; state?: string; city?: string; area?: string;
  sources: string[];
}): void {
  emitToAll('search:start', {
    type: 'search:start',
    sessionId,
    timestamp: new Date().toISOString(),
    data,
  });
}

export function emitSearchProgress(sessionId: string, data: {
  foundCount: number;
  savedCount: number;
  duplicateCount: number;
  failedCount: number;
  progress: number;
  currentSource: string;
  currentLead: string;
  currentStage?: string;
  currentUrl?: string;
  eta?: number;
  totalProcessed?: number;
  updatedAt: string;
}): void {
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

export function emitSearchLog(sessionId: string, entry: {
  timestamp: string; message: string; level: string;
}): void {
  emitToSession(sessionId, 'log:added', {
    type: 'log:added',
    sessionId,
    timestamp: entry.timestamp,
    data: entry,
  });
}

export function emitSearchStage(sessionId: string, stage: string): void {
  emitToSession(sessionId, 'search:stage', {
    type: 'search:stage',
    sessionId,
    timestamp: new Date().toISOString(),
    data: { stage },
  });
}

export function emitSearchHeartbeat(sessionId: string, data: { timestamp: string }): void {
  emitToSession(sessionId, 'heartbeat', {
    type: 'heartbeat',
    sessionId,
    timestamp: data.timestamp,
    data,
  });
}

export function emitLeadFound(sessionId: string, data: {
  businessName: string; source: string; totalLeads: number;
}): void {
  emitToSession(sessionId, 'lead:found', {
    type: 'lead:found',
    sessionId,
    timestamp: new Date().toISOString(),
    data,
  });
}

export function emitSourceUpdate(sessionId: string, data: {
  source: string; count: number; status: 'searching' | 'completed' | 'failed';
}): void {
  emitToSession(sessionId, 'source:update', {
    type: 'source:update',
    sessionId,
    timestamp: new Date().toISOString(),
    data,
  });
}

export function emitSearchCompleted(sessionId: string, data: {
  keyword: string; location: string; totalLeads: number; uniqueLeads: number;
  duplicatesRemoved: number; failedCount?: number;
  sourceBreakdown: Record<string, number>;
  durationMs: number;
  state?: string;
  city?: string;
  area?: string;
  sources?: string[];
  status?: string;
  progress?: number;
  finishedAt?: string;
}): void {
  emitToAll('search:completed', {
    type: 'search:completed',
    sessionId,
    timestamp: new Date().toISOString(),
    data,
  });
}

export function emitSearchStopped(sessionId: string): void {
  emitToAll('search:stopped', {
    type: 'search:stopped',
    sessionId,
    timestamp: new Date().toISOString(),
    data: {},
  });
}

export function emitSearchTimeout(sessionId: string, data: { error: string }): void {
  emitToAll('search:timeout', {
    type: 'search:timeout',
    sessionId,
    timestamp: new Date().toISOString(),
    data,
  });
}

export function emitSearchNoResults(sessionId: string, data: { message: string }): void {
  emitToAll('search:no-results', {
    type: 'search:no-results',
    sessionId,
    timestamp: new Date().toISOString(),
    data,
  });
}

export function emitSearchGoogleBlocked(sessionId: string, data: { error: string }): void {
  emitToAll('search:google-blocked', {
    type: 'search:google-blocked',
    sessionId,
    timestamp: new Date().toISOString(),
    data,
  });
}

export function emitSearchHistoryUpdate(sessionId: string, data: {
  keyword: string; state?: string; city?: string; area?: string; country?: string;
  sources: string[]; totalLeads: number; startedAt: string; completedAt: string;
  duration: number; status: string;
  businessesFound?: number;
  businessesSaved?: number;
  duplicates?: number;
  progress?: number;
  maxProgressReached?: number;
  failureReason?: string;
  failureClassification?: string;
  searchSessionId?: string;
}): void {
  emitToAll('search:history-update', {
    type: 'search:history-update',
    sessionId,
    timestamp: new Date().toISOString(),
    data,
  });
}

export function emitSearchError(sessionId: string, data: {
  error: string;
}): void {
  emitToAll('search:error', {
    type: 'search:error',
    sessionId,
    timestamp: new Date().toISOString(),
    data,
  });
}

export function emitSearchRecovered(sessionId: string, data: {
  keyword: string; location: string; state?: string; city?: string; area?: string;
  sources: string[]; leadsFound: number; uniqueLeads: number; duplicatesRemoved: number;
  failedCount: number; progressPercentage: number; elapsedMs: number;
}): void {
  emitToSession(sessionId, 'search:recovered', {
    type: 'search:recovered',
    sessionId,
    timestamp: new Date().toISOString(),
    data,
  });
}

export function emitLeadSaved(sessionId: string, data: {
  businessName?: string;
  source?: string;
  totalSaved: number;
}): void {
  emitToSession(sessionId, 'lead:saved', {
    type: 'lead:saved',
    sessionId,
    timestamp: new Date().toISOString(),
    data,
  });
}

export function emitDuplicateRemoved(sessionId: string, data: {
  businessName?: string;
  totalDuplicates: number;
}): void {
  emitToSession(sessionId, 'duplicate:removed', {
    type: 'duplicate:removed',
    sessionId,
    timestamp: new Date().toISOString(),
    data,
  });
}

export function emitLeadEnrichmentStarted(leadId: string): void {
  if (!io) return;
  io.emit('lead:enrichment:started', {
    type: 'lead:enrichment:started',
    leadId,
    timestamp: new Date().toISOString(),
  });
}

export function emitLeadEnrichmentStep(leadId: string, data: {
  step: string;
  stepIndex: number;
  totalSteps: number;
  progress: number;
  status: 'running' | 'completed' | 'failed' | 'skipped';
  error?: string;
}): void {
  if (!io) return;
  io.emit('lead:enrichment:step', {
    type: 'lead:enrichment:step',
    leadId,
    timestamp: new Date().toISOString(),
    data,
  });
}

export function emitLeadEnrichmentCompleted(leadId: string, data: {
  duration: number;
  totalSteps: number;
  errors: number;
}): void {
  if (!io) return;
  io.emit('lead:enrichment:completed', {
    type: 'lead:enrichment:completed',
    leadId,
    timestamp: new Date().toISOString(),
    data,
  });
}

export function emitLeadEnrichmentFailed(leadId: string, data: {
  error: string;
  duration: number;
  completedSteps: number;
  totalSteps: number;
}): void {
  if (!io) return;
  io.emit('lead:enrichment:failed', {
    type: 'lead:enrichment:failed',
    leadId,
    timestamp: new Date().toISOString(),
    data,
  });
}

export function emitEmailDiscoveryUpdate(leadId: string, data: {
  status: string;
  primaryEmail?: string;
  emailCount?: number;
  error?: string;
}): void {
  if (!io) return;
  io.emit('email:discovery:update', {
    type: 'email:discovery:update',
    leadId,
    timestamp: new Date().toISOString(),
    data,
  });
}

// ── Lead Processing Pipeline Events ──────────────────────────────────────────

export function emitLeadBusinessFound(sessionId: string, data: {
  leadId: string;
  companyName: string;
  source: string;
  totalFound: number;
}): void {
  emitToSession(sessionId, 'lead:business:found', {
    type: 'lead:business:found',
    sessionId,
    timestamp: new Date().toISOString(),
    data,
  });
}

export function emitLeadBusinessProcessing(sessionId: string, data: {
  leadId: string;
  companyName: string;
  step: string;
}): void {
  emitToSession(sessionId, 'lead:business:processing', {
    type: 'lead:business:processing',
    sessionId,
    timestamp: new Date().toISOString(),
    data,
  });
}

export function emitLeadBusinessAnalyzing(sessionId: string, data: {
  leadId: string;
  companyName: string;
  step: string;
  progress: number;
}): void {
  emitToSession(sessionId, 'lead:business:analyzing', {
    type: 'lead:business:analyzing',
    sessionId,
    timestamp: new Date().toISOString(),
    data,
  });
}

export function emitLeadBusinessCompleted(sessionId: string, data: {
  leadId: string;
  companyName: string;
  leadScore?: number;
  hasWebsite?: boolean;
  hasEmail?: boolean;
  hasPhone?: boolean;
}): void {
  emitToSession(sessionId, 'lead:business:completed', {
    type: 'lead:business:completed',
    sessionId,
    timestamp: new Date().toISOString(),
    data,
  });
}
