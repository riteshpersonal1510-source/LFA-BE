import { Router, Request, Response } from 'express';
import { emitToSession, emitToAll } from '../modules/automation-monitor/socket-manager';
import { searchStatus } from '../services/search-status.service';
import { logger } from '../utils/logger';

const router = Router();

router.post('/emit', (req: Request, res: Response) => {
    const { event, sessionId, data } = req.body;
    
    if (!event) {
        return res.status(400).json({ error: 'event is required' });
    }

    try {
        if (event === 'search:progress' && sessionId) {
            emitToSession(sessionId, 'search:progress', data);
        } else if (event === 'search:live-lead' && sessionId) {
            searchStatus.addLiveLead(sessionId, data.companyName, data.source);
            searchStatus.incrementFound(sessionId);
        } else if (event === 'search:saved-lead' && sessionId) {
            searchStatus.incrementSaved(sessionId, 1);
            emitToSession(sessionId, 'lead-saved', data);
        } else if (sessionId) {
            emitToSession(sessionId, event, data);
        } else {
            emitToAll(event, data);
        }
        return res.json({ success: true });
    } catch (err: any) {
        logger.error({ err: err.message }, 'Failed to process internal emit');
        return res.status(500).json({ error: err.message });
    }
});

export default router;
