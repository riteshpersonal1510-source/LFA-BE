import { Router, Request, Response } from 'express';
import { APIResponse } from '../utils/api-response';
import { getHealthReport, getDashboardMetrics } from '../recovery';
import { recoveryOrchestrator } from '../recovery/recovery-orchestrator';
import { getAllPipelines } from '../recovery/pipeline-tracker';

const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  const report = await getHealthReport();
  const statusCode = report.status === 'healthy' ? 200 : report.status === 'degraded' ? 200 : 503;
  res.status(statusCode).json({ success: true, data: report });
});

router.get('/dashboard', async (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string) || 7;
  const metrics = await getDashboardMetrics(days);
  APIResponse.success(res, metrics, 'Dashboard metrics');
});

router.get('/pipelines', (_req: Request, res: Response) => {
  const pipelines = getAllPipelines();
  APIResponse.success(res, pipelines, 'Active pipelines');
});

router.get('/pipelines/:sessionId', (req: Request, res: Response) => {
  const pipeline = recoveryOrchestrator.getPipeline(req.params.sessionId);
  if (!pipeline) {
    return APIResponse.error(res, 'Pipeline not found', undefined, 404);
  }
  return APIResponse.success(res, pipeline, 'Pipeline found');
});

router.get('/queue', (_req: Request, res: Response) => {
  const status = recoveryOrchestrator.getQueueStatus();
  APIResponse.success(res, status, 'Queue status');
});

router.post('/queue/pause', (_req: Request, res: Response) => {
  recoveryOrchestrator.pauseQueue();
  APIResponse.success(res, { paused: true }, 'Queue paused');
});

router.post('/queue/resume', (_req: Request, res: Response) => {
  recoveryOrchestrator.resumeQueue();
  APIResponse.success(res, { paused: false }, 'Queue resumed');
});

router.post('/queue/clear', (_req: Request, res: Response) => {
  const count = recoveryOrchestrator.clearQueue();
  APIResponse.success(res, { cleared: count }, 'Queue cleared');
});

router.get('/source-metrics', async (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string) || 7;
  const metrics = await recoveryOrchestrator.getSourceMetrics(days);
  APIResponse.success(res, metrics, 'Source metrics');
});

router.get('/search-stats', async (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string) || 7;
  const stats = await recoveryOrchestrator.getSearchHistoryStats(days);
  APIResponse.success(res, stats, 'Search statistics');
});

export default router;
