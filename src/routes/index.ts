import { Router } from 'express';
import healthRoute from './health.route';
import authRoute from './auth.route';
import leadsRoute from './leads.route';
import searchRoute from './search.route';
import exportRoute from './export.route';
import contactExtractionRoute from './contact-extraction.route';
import automationRoute from './automation.route';
import analyticsRoute from './analytics.route';
import scraperRoute from './scraper.route';
import sourceRoute from './source.route';
import crmRoute from './crm.route';
import areaAutomationRoute from './area-automation.route';
import responsiveAuditRoute from './responsive-audit.route';
import businessIntelligenceRoute from './business-intelligence.route';
import websiteIntelligenceRoute from './website-intelligence.route';
import salesIntelligenceRoute from './sales-intelligence.route';
import outreachRoute from './outreach.route';
import megaAIRoute from './mega-ai.route';
import { leadFiltersRoute } from './lead-filters.route';
import semanticSearchRoute from './semantic-search.route';
import { authenticate } from '../middlewares/auth.middleware';
import reportRoute from '../modules/reports/report.routes';
import monitorRoute from '../modules/automation-monitor/monitor.routes';
import whatsAppAutomationRoute from './whatsapp-automation.route';
import whatsAppAIBridgeRoute from './whatsapp-ai-bridge.route';
import whatsAppRoute from './whatsapp.route';
import searchAnalyticsRoute from './search-analytics.route';
import migrationRoute from './migration.route';
import emailDiscoveryRoute from './email-discovery.route';
import whatsAppTemplatesRoute from './whatsapp-templates.route';
import debugRoute from './debug.route';
import adminRoute from './admin.route';
import locationRoute from './location.route';
import adminLocationRoute from './admin-location.route';
import enrichmentRoute from './enrichment.route';
import recoveryRoute from './recovery.route';
import internalRoute from './internal.route';
const router = Router();

router.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    name: 'Lead Finder API',
    version: 'v1',
    status: 'online',
    timestamp: new Date().toISOString(),
    availableEndpoints: {
      auth: '/api/v1/auth',
      leads: '/api/v1/leads',
      search: '/api/v1/search',
      locations: '/api/v1/locations',
      analytics: '/api/v1/analytics',
    },
  });
});

router.use('/health', healthRoute);
router.use('/auth', authRoute);

// Diagnostic endpoints (no auth required)
router.use('/debug', debugRoute);

// Internal webhook endpoints for AI Service communication (no auth required)
router.use('/internal', internalRoute);

// Public health check for AI Service
router.get('/whatsapp-ai/health', async (_req, res) => {
  try {
    const { whatsAppAIService } = await import('../services/whatsapp-ai.service');
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const health = await whatsAppAIService.checkHealth();
    
    res.status(health.success ? 200 : 503).json({ 
      success: health.success,
      status: health.status,
      message: 'Backend ↔ AI Service connection ' + (health.success ? 'working' : 'failed'),
      aiService: {
        url: aiServiceUrl,
        status: health.status
      }
    });
  } catch (error: any) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    res.status(503).json({ 
      success: false,
      status: 'unhealthy',
      message: 'Backend ↔ AI Service connection failed',
      aiService: {
        url: aiServiceUrl,
        status: 'disconnected',
        error: error.message
      }
    });
  }
});

// Admin endpoints (require authentication)
router.use('/admin', authenticate, adminRoute);
router.use('/admin/locations', authenticate, adminLocationRoute);

// All routes below require authentication
router.use('/leads', authenticate, leadsRoute);
router.use('/reports', authenticate, reportRoute);
router.use('/leads/filters', authenticate, leadFiltersRoute);
router.use('/search', authenticate, searchRoute);
router.use('/semantic-search', authenticate, semanticSearchRoute);
router.use('/export', authenticate, exportRoute);
router.use('/extract-contact', authenticate, contactExtractionRoute);
router.use('/automation', authenticate, automationRoute);
router.use('/analytics', authenticate, analyticsRoute);
router.use('/scraper', authenticate, scraperRoute);
router.use('/sources', authenticate, sourceRoute);
router.use('/crm', authenticate, crmRoute);
router.use('/area-automation', authenticate, areaAutomationRoute);
router.use('/responsive-audit', authenticate, responsiveAuditRoute);
router.use('/business-intelligence', authenticate, businessIntelligenceRoute);
router.use('/website-intelligence', authenticate, websiteIntelligenceRoute);
router.use('/sales-intelligence', authenticate, salesIntelligenceRoute);
router.use('/outreach', authenticate, outreachRoute);
router.use('/mega-ai', authenticate, megaAIRoute);
router.use('/automation-monitor', authenticate, monitorRoute);
router.use('/whatsapp-automation', authenticate, whatsAppAutomationRoute);
router.use('/whatsapp-ai', authenticate, whatsAppAIBridgeRoute);
router.use('/whatsapp/templates', authenticate, whatsAppTemplatesRoute);
router.use('/whatsapp', authenticate, whatsAppRoute);
router.use('/search-analytics', authenticate, searchAnalyticsRoute);
router.use('/migration', authenticate, migrationRoute);
router.use('/email-discovery', authenticate, emailDiscoveryRoute);
router.use('/locations', authenticate, locationRoute);
router.use('/enrichment', authenticate, enrichmentRoute);
router.use('/recovery', authenticate, recoveryRoute);

export default router;
