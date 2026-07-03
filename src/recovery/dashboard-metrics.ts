import { SearchHistory } from '../models/SearchHistory';
import { Lead } from '../models/Lead';

export interface DashboardMetrics {
  generatedAt: string;
  period: { days: number; start: string; end: string };
  searchStats: {
    total: number;
    completed: number;
    failed: number;
    stopped: number;
    partial: number;
    timeout: number;
    noResults: number;
  };
  leadStats: {
    total: number;
    withWebsite: number;
    withPhone: number;
    withEmail: number;
    enriched: number;
    pendingEnrichment: number;
  };
  sourcePerformance: SourcePerformance[];
  pipelineStatus: {
    activePipelines: number;
    queuedTasks: number;
    activeTasks: number;
  };
  dailyTrend: Array<{
    date: string;
    searches: number;
    leadsFound: number;
    leadsSaved: number;
  }>;
}

export interface SourcePerformance {
  source: string;
  totalSearches: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  failureRate: number;
  avgDurationMs: number;
  totalLeads: number;
  avgLeadsPerSearch: number;
}

const SOURCES = ['google-maps', 'justdial', 'indiamart', 'clutch', 'official-website'];

export async function getDashboardMetrics(days: number = 7): Promise<DashboardMetrics> {
  const now = new Date();
  const start = new Date(now.getTime() - days * 86400000);

  const searchRecords = await SearchHistory.find({
    startedAt: { $gte: start },
  }).lean();

  const total = searchRecords.length;
  const completed = searchRecords.filter(r => r.status === 'COMPLETED').length;
  const failed = searchRecords.filter(r => r.status === 'FAILED').length;
  const stopped = searchRecords.filter(r => r.status === 'STOPPED').length;
  const partial = searchRecords.filter(r => r.status === 'PARTIAL_SUCCESS').length;
  const timeout = searchRecords.filter(r => r.status === 'TIMEOUT').length;
  const noResults = searchRecords.filter(r => r.status === 'NO_RESULTS').length;

  const leadStats = await getLeadStats();

  const sourcePerformance = computeSourcePerformance(searchRecords);

  const pipelineStatus = await getPipelineStatus();

  const dailyTrend = computeDailyTrend(searchRecords, days);

  return {
    generatedAt: new Date().toISOString(),
    period: {
      days,
      start: start.toISOString(),
      end: now.toISOString(),
    },
    searchStats: { total, completed, failed, stopped, partial, timeout, noResults },
    leadStats,
    sourcePerformance,
    pipelineStatus,
    dailyTrend,
  };
}

async function getLeadStats(): Promise<DashboardMetrics['leadStats']> {
  try {
    const [total, withWebsite, withPhone, withEmail, enriched, pendingEnrichment] = await Promise.all([
      Lead.countDocuments().maxTimeMS(10000),
      Lead.countDocuments({ website: { $exists: true, $nin: [null, ''] } }).maxTimeMS(10000),
      Lead.countDocuments({ phone: { $exists: true, $nin: [null, ''] } }).maxTimeMS(10000),
      Lead.countDocuments({ email: { $exists: true, $nin: [null, ''] } }).maxTimeMS(10000),
      Lead.countDocuments({ enrichmentStatus: 'completed' }).maxTimeMS(10000),
      Lead.countDocuments({
        $or: [
          { enrichmentStatus: { $in: ['pending', null, 'failed'] } },
          { enrichmentStatus: { $exists: false } },
        ],
        website: { $exists: true, $nin: [null, ''] },
      }).maxTimeMS(10000),
    ]);

    return { total, withWebsite, withPhone, withEmail, enriched, pendingEnrichment };
  } catch {
    return { total: 0, withWebsite: 0, withPhone: 0, withEmail: 0, enriched: 0, pendingEnrichment: 0 };
  }
}

function computeSourcePerformance(records: Array<Record<string, unknown>>): SourcePerformance[] {
  return SOURCES.map(source => {
    const sourceRecords = records.filter(r => {
      const sources = r.sources;
      return Array.isArray(sources) && sources.includes(source);
    });

    const total = sourceRecords.length;
    if (total === 0) {
      return {
        source,
        totalSearches: 0,
        successCount: 0,
        failureCount: 0,
        successRate: 0,
        failureRate: 0,
        avgDurationMs: 0,
        totalLeads: 0,
        avgLeadsPerSearch: 0,
      };
    }

    const successful = sourceRecords.filter(r => r.status === 'COMPLETED' || r.status === 'PARTIAL_SUCCESS');
    const successCount = successful.length;
    const failureCount = total - successCount;
    const successRate = Math.round((successCount / total) * 100);
    const failureRate = Math.round((failureCount / total) * 100);

    const withDuration = successful.filter(r => typeof r.duration === 'number' && r.duration > 0) as Array<Record<string, unknown> & { duration: number }>;
    const avgDurationMs = withDuration.length > 0
      ? Math.round(withDuration.reduce((sum, r) => sum + r.duration, 0) / withDuration.length)
      : 0;

    const totalLeads = sourceRecords.reduce((sum, r) => sum + ((r as Record<string, unknown> & { totalLeads?: number }).totalLeads || 0), 0);
    const avgLeadsPerSearch = total > 0 ? Math.round(totalLeads / total) : 0;

    return {
      source,
      totalSearches: total,
      successCount,
      failureCount,
      successRate,
      failureRate,
      avgDurationMs,
      totalLeads,
      avgLeadsPerSearch,
    };
  });
}

async function getPipelineStatus(): Promise<DashboardMetrics['pipelineStatus']> {
  try {
    const { getAllPipelines } = await import('./pipeline-tracker');
    const { recoveryOrchestrator } = await import('./recovery-orchestrator');

    const pipelines = getAllPipelines();
    const queueStatus = recoveryOrchestrator.getQueueStatus();

    return {
      activePipelines: pipelines.filter(p => p.overallStatus === 'running').length,
      queuedTasks: queueStatus.queueLength,
      activeTasks: queueStatus.activeCount,
    };
  } catch {
    return { activePipelines: 0, queuedTasks: 0, activeTasks: 0 };
  }
}

function computeDailyTrend(records: Array<Record<string, unknown>>, days: number): Array<{ date: string; searches: number; leadsFound: number; leadsSaved: number }> {
  const trend: Array<{ date: string; searches: number; leadsFound: number; leadsSaved: number }> = [];

  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date(Date.now() - i * 86400000);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const dayRecords = records.filter(r => {
      const startedAt = r.startedAt;
      if (!startedAt) return false;
      const d = new Date(startedAt as string);
      return d >= dayStart && d <= dayEnd;
    });

    trend.push({
      date: dayStart.toISOString().split('T')[0],
      searches: dayRecords.length,
      leadsFound: dayRecords.reduce((sum, r) => sum + ((r as Record<string, unknown> & { totalFound?: number }).totalFound || 0), 0),
      leadsSaved: dayRecords.reduce((sum, r) => sum + ((r as Record<string, unknown> & { uniqueSaved?: number }).uniqueSaved || 0), 0),
    });
  }

  return trend;
}
