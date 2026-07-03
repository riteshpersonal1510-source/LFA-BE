import { Router, Request, Response, NextFunction } from 'express';
import { enrichmentController } from '../controllers/enrichment.controller';
import { asyncHandler } from '../utils/error-handler';

const router = Router();

const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  asyncHandler(fn);

router.get('/status', wrap(enrichmentController.getOrchestratorStatus));

router.get('/leads', wrap(enrichmentController.getEnrichableLeads));

router.post('/leads/:id/enqueue', wrap(enrichmentController.enqueueLead));

router.post('/leads/enqueue-batch', wrap(enrichmentController.enqueueMultiple));

router.post('/leads/:id/enrich', wrap(enrichmentController.enrichLead));

router.get('/leads/:id/status', wrap(enrichmentController.getEnrichmentStatus));

router.post('/backfill/start', wrap(enrichmentController.startBackfill));

router.post('/backfill/missing-fields', wrap(enrichmentController.startMissingFieldsBackfill));

router.get('/backfill/status', wrap(enrichmentController.getBackfillStatus));

router.get('/missing-fields/count', wrap(enrichmentController.getMissingFieldsCount));

router.post('/cache/clear', wrap(enrichmentController.clearCache));

export default router;
