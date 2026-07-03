"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const automation_controller_1 = require("../controllers/automation.controller");
const validations_1 = require("../utils/validations");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const createAutomationSchema = zod_1.z.object({
    body: zod_1.z.object({
        keyword: zod_1.z.string().min(2, 'Keyword must be at least 2 characters'),
        location: zod_1.z.string().min(2, 'Location must be at least 2 characters'),
        frequency: zod_1.z.enum(['hourly', 'daily', 'weekly']),
        limit: zod_1.z.number().min(1).max(100).optional().default(50),
        category: zod_1.z.string().optional(),
    }),
});
const updateAutomationSchema = zod_1.z.object({
    body: zod_1.z.object({
        keyword: zod_1.z.string().min(2).optional(),
        location: zod_1.z.string().min(2).optional(),
        frequency: zod_1.z.enum(['hourly', 'daily', 'weekly']).optional(),
        limit: zod_1.z.number().min(1).max(100).optional(),
        category: zod_1.z.string().optional(),
        status: zod_1.z.enum(['active', 'paused', 'failed']).optional(),
    }),
});
router.get('/', (req, res, next) => {
    automation_controller_1.automationController.getAllAutomations(req, res, next);
});
router.get('/:id', (req, res, next) => {
    automation_controller_1.automationController.getAutomation(req, res, next);
});
router.post('/', (0, validations_1.validate)(createAutomationSchema), (req, res, next) => {
    automation_controller_1.automationController.createAutomation(req, res, next);
});
router.patch('/:id', (0, validations_1.validate)(updateAutomationSchema), (req, res, next) => {
    automation_controller_1.automationController.updateAutomation(req, res, next);
});
router.patch('/:id/toggle', (req, res, next) => {
    automation_controller_1.automationController.toggleAutomation(req, res, next);
});
router.delete('/:id', (req, res, next) => {
    automation_controller_1.automationController.deleteAutomation(req, res, next);
});
router.post('/:id/run', (req, res, next) => {
    automation_controller_1.automationController.runAutomation(req, res, next);
});
router.get('/:id/logs', (req, res, next) => {
    automation_controller_1.automationController.getAutomationLogs(req, res, next);
});
router.get('/:id/statistics', (req, res, next) => {
    automation_controller_1.automationController.getAutomationStatistics(req, res, next);
});
router.get('/:id/exports', (req, res, next) => {
    automation_controller_1.automationController.getExportHistory(req, res, next);
});
exports.default = router;
//# sourceMappingURL=automation.route.js.map