import { Router, type Request, type Response, type NextFunction } from 'express';
import { reportController } from './report.controller';

const router = Router();

router.post('/generate/:leadId', (req: Request, res: Response, next: NextFunction) => reportController.generateReport(req, res, next));
router.get('/status/:leadId', (req: Request, res: Response, next: NextFunction) => reportController.getReportStatus(req, res, next));
router.get('/progress/:leadId', (req: Request, res: Response, next: NextFunction) => reportController.getReportProgress(req, res, next));
router.get('/view/:leadId', (req: Request, res: Response, next: NextFunction) => reportController.viewReport(req, res, next));
router.get('/download/:leadId', (req: Request, res: Response, next: NextFunction) => reportController.downloadReport(req, res, next));
router.delete('/:leadId', (req: Request, res: Response, next: NextFunction) => reportController.deleteReport(req, res, next));

export default router;
