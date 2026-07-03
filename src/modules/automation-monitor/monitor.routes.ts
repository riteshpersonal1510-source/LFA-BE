import { Router, type Request, type Response, type NextFunction } from 'express';
import { monitorController } from './monitor.controller';

const router = Router();

router.get('/:sessionId/logs', (req: Request, res: Response, next: NextFunction) => monitorController.getLogs(req, res, next));
router.get('/:sessionId/live', (req: Request, res: Response, next: NextFunction) => monitorController.getLiveStatus(req, res, next));
router.get('/:sessionId/stats', (req: Request, res: Response, next: NextFunction) => monitorController.getStats(req, res, next));
router.get('/:sessionId/memory-logs', (req: Request, res: Response, next: NextFunction) => monitorController.getMemoryLogs(req, res, next));
router.delete('/:sessionId/memory-logs', (req: Request, res: Response, next: NextFunction) => monitorController.clearMemoryLogs(req, res, next));

export default router;
