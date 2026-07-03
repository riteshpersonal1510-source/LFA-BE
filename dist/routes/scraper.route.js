"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const scraper_controller_1 = require("../controllers/scraper.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const scraping_progress_1 = require("../services/scraping-progress");
const router = (0, express_1.Router)();
router.get('/status', auth_middleware_1.authenticate, scraper_controller_1.scraperController.getStatus);
router.get('/metrics', auth_middleware_1.authenticate, scraper_controller_1.scraperController.getMetrics);
router.post('/restart', auth_middleware_1.authenticate, scraper_controller_1.scraperController.restart);
router.get('/sessions', auth_middleware_1.authenticate, scraper_controller_1.scraperController.getSessions);
router.get('/progress/:sessionId', auth_middleware_1.authenticate, (req, res) => {
    const { sessionId } = req.params;
    const progress = scraping_progress_1.scrapingProgress.getProgress(sessionId);
    if (!progress) {
        res.status(404).json({ success: false, message: 'Session not found' });
        return;
    }
    res.json({ success: true, data: progress });
});
router.get('/search-progress/:sessionId', auth_middleware_1.authenticate, scraper_controller_1.scraperController.getSearchStatus);
exports.default = router;
//# sourceMappingURL=scraper.route.js.map