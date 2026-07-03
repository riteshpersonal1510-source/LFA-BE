import { logger } from '../utils/logger';
import { emitToAll, emitToSession } from '../modules/automation-monitor/socket-manager';

export enum PipelineStage {
  DISCOVERY = 'DISCOVERY',
  EXTRACTION = 'EXTRACTION',
  WEBSITE_CRAWL = 'WEBSITE_CRAWL',
  ENRICHMENT = 'ENRICHMENT',
  MONGODB = 'MONGODB',
  API = 'API',
  FRONTEND = 'FRONTEND',
}

export type StageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface StageRecord {
  stage: PipelineStage;
  status: StageStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
  retries: number;
  metadata?: Record<string, unknown>;
}

export interface PipelineState {
  sessionId: string;
  keyword: string;
  stages: Record<PipelineStage, StageRecord>;
  overallStatus: 'running' | 'completed' | 'failed' | 'partial';
  startedAt: string;
  completedAt?: string;
  error?: string;
}

const activePipelines = new Map<string, PipelineState>();

function now(): string {
  return new Date().toISOString();
}

function createStage(stage: PipelineStage): StageRecord {
  return {
    stage,
    status: 'pending',
    startedAt: '',
    retries: 0,
  };
}

export function createPipeline(sessionId: string, keyword: string): PipelineState {
  const pipeline: PipelineState = {
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

export function startStage(sessionId: string, stage: PipelineStage): void {
  const pipeline = activePipelines.get(sessionId);
  if (!pipeline) return;

  const record = pipeline.stages[stage];
  record.status = 'running';
  record.startedAt = now();

  logger.info({ sessionId, stage, keyword: pipeline.keyword }, 'Pipeline: Stage started');
  emitStageUpdate(sessionId, stage, record);
}

export function completeStage(sessionId: string, stage: PipelineStage, metadata?: Record<string, unknown>): void {
  const pipeline = activePipelines.get(sessionId);
  if (!pipeline) return;

  const record = pipeline.stages[stage];
  record.status = 'completed';
  record.completedAt = now();
  record.durationMs = new Date(record.completedAt).getTime() - new Date(record.startedAt).getTime();
  if (metadata) record.metadata = metadata;

  logger.info({
    sessionId, stage, keyword: pipeline.keyword,
    durationMs: record.durationMs,
  }, 'Pipeline: Stage completed');

  emitStageUpdate(sessionId, stage, record);
  checkPipelineComplete(sessionId, pipeline);
}

export function failStage(sessionId: string, stage: PipelineStage, error: string): void {
  const pipeline = activePipelines.get(sessionId);
  if (!pipeline) return;

  const record = pipeline.stages[stage];
  record.status = 'failed';
  record.completedAt = now();
  record.error = error;
  record.durationMs = new Date(record.completedAt!).getTime() - new Date(record.startedAt).getTime();

  logger.error({ sessionId, stage, error, keyword: pipeline.keyword }, 'Pipeline: Stage failed');
  emitStageUpdate(sessionId, stage, record);
}

export function incrementRetry(sessionId: string, stage: PipelineStage): void {
  const pipeline = activePipelines.get(sessionId);
  if (!pipeline) return;

  pipeline.stages[stage].retries++;
  logger.info({
    sessionId, stage, retries: pipeline.stages[stage].retries,
  }, 'Pipeline: Stage retry incremented');
}

export function getPipeline(sessionId: string): PipelineState | undefined {
  return activePipelines.get(sessionId);
}

export function getAllPipelines(): PipelineState[] {
  return Array.from(activePipelines.values());
}

export function removePipeline(sessionId: string): void {
  activePipelines.delete(sessionId);
}

export function cleanupOldPipelines(maxAgeMs: number = 3600000): number {
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

function checkPipelineComplete(sessionId: string, pipeline: PipelineState): void {
  const stages = Object.values(pipeline.stages);
  const allDone = stages.every(s => s.status === 'completed' || s.status === 'failed' || s.status === 'skipped');

  if (!allDone) return;

  const hasFailures = stages.some(s => s.status === 'failed');
  pipeline.overallStatus = hasFailures ? 'partial' : 'completed';
  pipeline.completedAt = now();

  if (hasFailures) {
    pipeline.error = stages
      .filter(s => s.status === 'failed')
      .map(s => `[${s.stage}] ${s.error}`)
      .join('; ');
  }

  logger.info({
    sessionId,
    overallStatus: pipeline.overallStatus,
    keyword: pipeline.keyword,
    stages: stages.map(s => `${s.stage}=${s.status}`).join(', '),
  }, 'Pipeline: Complete');

  emitPipelineUpdate(sessionId, pipeline);
}

function emitStageUpdate(sessionId: string, stage: PipelineStage, record: StageRecord): void {
  emitToSession(sessionId, 'pipeline:stage', {
    type: 'pipeline:stage',
    sessionId,
    stage,
    status: record.status,
    durationMs: record.durationMs,
    error: record.error,
    timestamp: now(),
  });

  emitToAll('pipeline:stage:global', {
    sessionId,
    stage,
    status: record.status,
    keyword: activePipelines.get(sessionId)?.keyword,
    timestamp: now(),
  });
}

function emitPipelineUpdate(sessionId: string, pipeline: PipelineState): void {
  emitToSession(sessionId, 'pipeline:update', {
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
