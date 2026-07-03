"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const health_check_1 = require("../recovery/health-check");
const python_scraper_service_1 = require("../services/python-scraper.service");
const router = (0, express_1.Router)();
router.get('/', async (_req, res) => {
    const health = await (0, health_check_1.getSimpleHealth)();
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
router.get('/detailed', async (_req, res) => {
    const report = await (0, health_check_1.getHealthReport)();
    const statusCode = report.status === 'unhealthy' ? 503 : 200;
    res.status(statusCode).json(report);
});
router.get('/sources', async (_req, res) => {
    const report = await (0, health_check_1.getHealthReport)();
    const sources = report.components.filter(c => ['Google Maps', 'JustDial', 'IndiaMART', 'Clutch', 'Website Enrichment'].includes(c.name));
    res.json({ success: true, data: sources });
});
router.get('/workers', async (_req, res) => {
    const report = await (0, health_check_1.getHealthReport)();
    const workers = report.components.find(c => c.name === 'Workers');
    res.json({ success: true, data: workers });
});
router.get('/python-scraper', async (_req, res) => {
    const ok = await python_scraper_service_1.pythonScraperService.healthCheck();
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
exports.default = router;
//# sourceMappingURL=health.route.js.map