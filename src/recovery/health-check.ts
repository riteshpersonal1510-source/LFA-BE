import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import { Lead } from '../models/Lead';
import { SearchHistory } from '../models/SearchHistory';
import { getAllPipelines } from './pipeline-tracker';
import { recoveryOrchestrator } from './recovery-orchestrator';

export interface HealthComponent {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  message?: string;
  latencyMs?: number;
  details?: Record<string, unknown>;
}

export interface HealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  environment: string;
  components: HealthComponent[];
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

async function checkComponent(
  name: string,
  check: () => Promise<string | null>,
  timeoutMs: number = 5000,
): Promise<HealthComponent> {
  const start = Date.now();

  try {
    const result = await Promise.race([
      check(),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeoutMs),
      ),
    ]);

    const latencyMs = Date.now() - start;

    if (result === null) {
      return { name, status: 'healthy', latencyMs };
    }

    return { name, status: 'degraded', message: result, latencyMs };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { name, status: 'unhealthy', message: msg, latencyMs: Date.now() - start };
  }
}

async function checkMongoDB(): Promise<string | null> {
  const state = mongoose.connection.readyState;
  if (state === 1) return null;

  try {
    await mongoose.connection.db?.admin().ping();
    return null;
  } catch {
    return `Connection state: ${state}`;
  }
}

async function checkGoogleMaps(): Promise<string | null> {
  const recent = await SearchHistory.find({
    sources: 'google-maps',
    startedAt: { $gte: new Date(Date.now() - 86400000) },
  })
    .sort({ startedAt: -1 })
    .limit(5)
    .lean();

  if (recent.length === 0) return null;

  const failures = recent.filter(r => r.status === 'FAILED' || r.status === 'TIMEOUT' || String(r.searchState).includes('GOOGLE_BLOCKED'));
  if (failures.length >= 3) {
    return `${failures.length}/${recent.length} recent searches failed`;
  }

  return null;
}

async function checkJustDial(): Promise<string | null> {
  const recent = await SearchHistory.find({
    sources: 'justdial',
    startedAt: { $gte: new Date(Date.now() - 86400000) },
  })
    .sort({ startedAt: -1 })
    .limit(5)
    .lean();

  if (recent.length === 0) return null;

  const failures = recent.filter(r => r.status === 'FAILED' || r.status === 'TIMEOUT');
  if (failures.length >= 3) {
    return `${failures.length}/${recent.length} recent searches failed`;
  }

  return null;
}

async function checkIndiaMART(): Promise<string | null> {
  const recent = await SearchHistory.find({
    sources: 'indiamart',
    startedAt: { $gte: new Date(Date.now() - 86400000) },
  })
    .sort({ startedAt: -1 })
    .limit(5)
    .lean();

  if (recent.length === 0) return null;

  const failures = recent.filter(r => r.status === 'FAILED' || r.status === 'TIMEOUT');
  if (failures.length >= 3) {
    return `${failures.length}/${recent.length} recent searches failed`;
  }

  return null;
}

async function checkClutch(): Promise<string | null> {
  const recent = await SearchHistory.find({
    sources: 'clutch',
    startedAt: { $gte: new Date(Date.now() - 86400000) },
  })
    .sort({ startedAt: -1 })
    .limit(5)
    .lean();

  if (recent.length === 0) return null;

  const failures = recent.filter(r => r.status === 'FAILED' || r.status === 'TIMEOUT');
  if (failures.length >= 3) {
    return `${failures.length}/${recent.length} recent searches failed`;
  }

  return null;
}

async function checkWebsiteEnrichment(): Promise<string | null> {
  try {
    const pending = await Lead.countDocuments({
      $or: [
        { enrichmentStatus: { $in: ['pending', null, 'failed'] } },
        { enrichmentStatus: { $exists: false } },
      ],
      website: { $exists: true, $nin: [null, ''] },
    }).maxTimeMS(5000);

    if (pending > 1000) {
      return `${pending} leads pending enrichment`;
    }

    return null;
  } catch {
    return 'Query timed out';
  }
}

async function checkWorkers(): Promise<string | null> {
  const queueStatus = recoveryOrchestrator.getQueueStatus();
  const pipelines = getAllPipelines();

  const runningPipelines = pipelines.filter(p => p.overallStatus === 'running');

  return {
    activeTasks: queueStatus.activeCount,
    queuedTasks: queueStatus.queueLength,
    runningPipelines: runningPipelines.length,
    maxConcurrent: queueStatus.maxConcurrent,
  } as unknown as string;
}

async function checkSocketIO(): Promise<string | null> {
  try {
    const { getSocketIO } = await import('../modules/automation-monitor/socket-manager');
    const io = getSocketIO();
    if (!io) {
      return 'Socket.IO not initialized';
    }

    const sockets = await io.of('/automation-monitor').fetchSockets().catch(() => null);
    if (sockets === null) {
      return 'Socket.IO namespace not accessible';
    }

    return null;
  } catch {
    return 'Socket.IO check failed';
  }
}

const HEALTH_CHECKS: Array<{ name: string; check: () => Promise<string | null> }> = [
  { name: 'MongoDB', check: checkMongoDB },
  { name: 'Google Maps', check: checkGoogleMaps },
  { name: 'JustDial', check: checkJustDial },
  { name: 'IndiaMART', check: checkIndiaMART },
  { name: 'Clutch', check: checkClutch },
  { name: 'Website Enrichment', check: checkWebsiteEnrichment },
  { name: 'Workers', check: checkWorkers },
  { name: 'Socket.IO', check: checkSocketIO },
];

export async function getHealthReport(): Promise<HealthReport> {
  const componentResults = await Promise.all(
    HEALTH_CHECKS.map(hc => checkComponent(hc.name, hc.check)),
  );

  const healthy = componentResults.filter(c => c.status === 'healthy').length;
  const degraded = componentResults.filter(c => c.status === 'degraded').length;
  const unhealthy = componentResults.filter(c => c.status === 'unhealthy').length;

  const overall: 'healthy' | 'degraded' | 'unhealthy' =
    unhealthy > 0 ? 'unhealthy' : degraded > 0 ? 'degraded' : 'healthy';

  const report: HealthReport = {
    status: overall,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    components: componentResults,
    summary: { total: componentResults.length, healthy, degraded, unhealthy },
  };

  logger.info({
    status: report.status,
    healthy: report.summary.healthy,
    degraded: report.summary.degraded,
    unhealthy: report.summary.unhealthy,
  }, 'HealthCheck: Report generated');

  return report;
}

export async function getSimpleHealth(): Promise<{
  status: string;
  timestamp: string;
  database: string;
}> {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : 'disconnected';

  return {
    status: dbState === 1 ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    database: dbStatus,
  };
}
