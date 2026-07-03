import { Router, type Request, type Response } from 'express';
import { getSimpleHealth, getHealthReport } from '../recovery/health-check';
import { pythonScraperService } from '../services/python-scraper.service';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const health = await getSimpleHealth();
  const env = process.env.NODE_ENV || 'development';
  res.json({
    status: health.status,
    uptime: process.uptime(),
    database: health.database,
    version: process.env.npm_package_version || '1.0.0',
    timestamp: health.timestamp,
    environment: env,
  });
});

router.get('/detailed', async (_req: Request, res: Response) => {
  const report = await getHealthReport();
  const statusCode = report.status === 'unhealthy' ? 503 : 200;
  res.status(statusCode).json(report);
});

router.get('/sources', async (_req: Request, res: Response) => {
  const report = await getHealthReport();
  const sources = report.components.filter(c =>
    ['Google Maps', 'JustDial', 'IndiaMART', 'Clutch', 'Website Enrichment'].includes(c.name)
  );
  res.json({ success: true, data: sources });
});

router.get('/workers', async (_req: Request, res: Response) => {
  const report = await getHealthReport();
  const workers = report.components.find(c => c.name === 'Workers');
  res.json({ success: true, data: workers });
});

/** Check Python scraper service reachability */
router.get('/python-scraper', async (_req: Request, res: Response) => {
  const ok = await pythonScraperService.healthCheck();
  const pythonUrl = process.env.PYTHON_SCRAPER_URL || 'http://localhost:8001';
  res.status(ok ? 200 : 503).json({
    success: ok,
    pythonScraper: ok ? 'reachable' : 'unreachable',
    url: pythonUrl,
    scrapingEngine: 'python',
    message: ok
      ? 'Python scraper service is online'
      : 'Python scraper service is offline — start with: cd python-scraper && uvicorn main:app --host 0.0.0.0 --port 8001',
  });
});

export default router;
