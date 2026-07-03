"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const report_controller_1 = require("./report.controller");
const router = (0, express_1.Router)();
router.post('/generate/:leadId', (req, res, next) => report_controller_1.reportController.generateReport(req, res, next));
router.get('/status/:leadId', (req, res, next) => report_controller_1.reportController.getReportStatus(req, res, next));
router.get('/progress/:leadId', (req, res, next) => report_controller_1.reportController.getReportProgress(req, res, next));
router.get('/view/:leadId', (req, res, next) => report_controller_1.reportController.viewReport(req, res, next));
router.get('/download/:leadId', (req, res, next) => report_controller_1.reportController.downloadReport(req, res, next));
router.delete('/:leadId', (req, res, next) => report_controller_1.reportController.deleteReport(req, res, next));
exports.default = router;
//# sourceMappingURL=report.routes.js.map