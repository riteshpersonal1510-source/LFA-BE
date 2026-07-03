"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const health_route_1 = __importDefault(require("./health.route"));
const auth_route_1 = __importDefault(require("./auth.route"));
const leads_route_1 = __importDefault(require("./leads.route"));
const search_route_1 = __importDefault(require("./search.route"));
const export_route_1 = __importDefault(require("./export.route"));
const contact_extraction_route_1 = __importDefault(require("./contact-extraction.route"));
const automation_route_1 = __importDefault(require("./automation.route"));
const analytics_route_1 = __importDefault(require("./analytics.route"));
const scraper_route_1 = __importDefault(require("./scraper.route"));
const source_route_1 = __importDefault(require("./source.route"));
const crm_route_1 = __importDefault(require("./crm.route"));
const area_automation_route_1 = __importDefault(require("./area-automation.route"));
const responsive_audit_route_1 = __importDefault(require("./responsive-audit.route"));
const business_intelligence_route_1 = __importDefault(require("./business-intelligence.route"));
const website_intelligence_route_1 = __importDefault(require("./website-intelligence.route"));
const sales_intelligence_route_1 = __importDefault(require("./sales-intelligence.route"));
const outreach_route_1 = __importDefault(require("./outreach.route"));
const mega_ai_route_1 = __importDefault(require("./mega-ai.route"));
const lead_filters_route_1 = require("./lead-filters.route");
const semantic_search_route_1 = __importDefault(require("./semantic-search.route"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const report_routes_1 = __importDefault(require("../modules/reports/report.routes"));
const monitor_routes_1 = __importDefault(require("../modules/automation-monitor/monitor.routes"));
const whatsapp_automation_route_1 = __importDefault(require("./whatsapp-automation.route"));
const whatsapp_ai_bridge_route_1 = __importDefault(require("./whatsapp-ai-bridge.route"));
const whatsapp_route_1 = __importDefault(require("./whatsapp.route"));
const search_analytics_route_1 = __importDefault(require("./search-analytics.route"));
const migration_route_1 = __importDefault(require("./migration.route"));
const email_discovery_route_1 = __importDefault(require("./email-discovery.route"));
const whatsapp_templates_route_1 = __importDefault(require("./whatsapp-templates.route"));
const debug_route_1 = __importDefault(require("./debug.route"));
const admin_route_1 = __importDefault(require("./admin.route"));
const location_route_1 = __importDefault(require("./location.route"));
const admin_location_route_1 = __importDefault(require("./admin-location.route"));
const enrichment_route_1 = __importDefault(require("./enrichment.route"));
const recovery_route_1 = __importDefault(require("./recovery.route"));
const internal_route_1 = __importDefault(require("./internal.route"));
const router = (0, express_1.Router)();
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
router.use('/health', health_route_1.default);
router.use('/auth', auth_route_1.default);
router.use('/debug', debug_route_1.default);
router.use('/internal', internal_route_1.default);
router.get('/whatsapp-ai/health', async (_req, res) => {
    try {
        const { whatsAppAIService } = await Promise.resolve().then(() => __importStar(require('../services/whatsapp-ai.service')));
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
    }
    catch (error) {
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
router.use('/admin', auth_middleware_1.authenticate, admin_route_1.default);
router.use('/admin/locations', auth_middleware_1.authenticate, admin_location_route_1.default);
router.use('/leads', auth_middleware_1.authenticate, leads_route_1.default);
router.use('/reports', auth_middleware_1.authenticate, report_routes_1.default);
router.use('/leads/filters', auth_middleware_1.authenticate, lead_filters_route_1.leadFiltersRoute);
router.use('/search', auth_middleware_1.authenticate, search_route_1.default);
router.use('/semantic-search', auth_middleware_1.authenticate, semantic_search_route_1.default);
router.use('/export', auth_middleware_1.authenticate, export_route_1.default);
router.use('/extract-contact', auth_middleware_1.authenticate, contact_extraction_route_1.default);
router.use('/automation', auth_middleware_1.authenticate, automation_route_1.default);
router.use('/analytics', auth_middleware_1.authenticate, analytics_route_1.default);
router.use('/scraper', auth_middleware_1.authenticate, scraper_route_1.default);
router.use('/sources', auth_middleware_1.authenticate, source_route_1.default);
router.use('/crm', auth_middleware_1.authenticate, crm_route_1.default);
router.use('/area-automation', auth_middleware_1.authenticate, area_automation_route_1.default);
router.use('/responsive-audit', auth_middleware_1.authenticate, responsive_audit_route_1.default);
router.use('/business-intelligence', auth_middleware_1.authenticate, business_intelligence_route_1.default);
router.use('/website-intelligence', auth_middleware_1.authenticate, website_intelligence_route_1.default);
router.use('/sales-intelligence', auth_middleware_1.authenticate, sales_intelligence_route_1.default);
router.use('/outreach', auth_middleware_1.authenticate, outreach_route_1.default);
router.use('/mega-ai', auth_middleware_1.authenticate, mega_ai_route_1.default);
router.use('/automation-monitor', auth_middleware_1.authenticate, monitor_routes_1.default);
router.use('/whatsapp-automation', auth_middleware_1.authenticate, whatsapp_automation_route_1.default);
router.use('/whatsapp-ai', auth_middleware_1.authenticate, whatsapp_ai_bridge_route_1.default);
router.use('/whatsapp/templates', auth_middleware_1.authenticate, whatsapp_templates_route_1.default);
router.use('/whatsapp', auth_middleware_1.authenticate, whatsapp_route_1.default);
router.use('/search-analytics', auth_middleware_1.authenticate, search_analytics_route_1.default);
router.use('/migration', auth_middleware_1.authenticate, migration_route_1.default);
router.use('/email-discovery', auth_middleware_1.authenticate, email_discovery_route_1.default);
router.use('/locations', auth_middleware_1.authenticate, location_route_1.default);
router.use('/enrichment', auth_middleware_1.authenticate, enrichment_route_1.default);
router.use('/recovery', auth_middleware_1.authenticate, recovery_route_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map