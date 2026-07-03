import { Router, Request, Response, NextFunction } from 'express';
import { whatsAppAIService } from '../services/whatsapp-ai.service';
import { logger } from '../utils/logger';

const router = Router();

router.post('/start-campaign', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { leadIds } = req.body;
    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      logger.warn('[WhatsAppAI] start-campaign called without valid leadIds');
      res.status(400).json({ 
        success: false, 
        message: 'leadIds must be a non-empty array',
        error: 'INVALID_LEADS_ARRAY',
        code: 'INVALID_LEADS_ARRAY'
      });
      return;
    }
    const result = await whatsAppAIService.startCampaign(leadIds);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    const errorCode = error.code || 'CAMPAIGN_START_FAILED';
    const message = error.message || 'Failed to start campaign';
    
    logger.error(
      { statusCode, errorCode, message, leadIds: req.body?.leadIds?.length || 0 },
      '[WhatsAppAI] start-campaign error'
    );
    
    res.status(statusCode).json({
      success: false,
      message,
      error: errorCode,
      code: errorCode
    });
  }
});

router.get('/campaign-status/:sessionId', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const result = await whatsAppAIService.getSessionStatus(sessionId);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    const statusCode = error.statusCode || error.response?.status || 500;
    const message = error.message || 'Failed to get session status';
    
    logger.error({ statusCode, message }, '[WhatsAppAI] campaign-status error');
    res.status(statusCode).json({ success: false, message });
  }
});

router.post('/stop-campaign/:sessionId', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const result = await whatsAppAIService.stopCampaign(sessionId);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    const statusCode = error.statusCode || error.response?.status || 500;
    const message = error.message || 'Failed to stop campaign';
    
    logger.error({ statusCode, message }, '[WhatsAppAI] stop-campaign error');
    res.status(statusCode).json({ success: false, message });
  }
});

export default router;
