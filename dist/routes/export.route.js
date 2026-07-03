"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const exporter_controller_1 = require("../controllers/exporter.controller");
const validations_1 = require("../utils/validations");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const csvExportSchema = zod_1.z.object({
    query: zod_1.z.object({
        qualificationLevel: zod_1.z.enum(['high-potential', 'medium-potential', 'low-potential']).optional(),
        websiteStatus: zod_1.z.enum(['no-website', 'broken-website', 'outdated-website', 'average-website', 'modern-website']).optional(),
        category: zod_1.z.string().optional(),
        minLeadScore: zod_1.z.coerce.number().optional(),
        maxLeadScore: zod_1.z.coerce.number().optional(),
        search: zod_1.z.string().optional(),
    }).optional(),
});
const excelExportSchema = zod_1.z.object({
    query: zod_1.z.object({
        qualificationLevel: zod_1.z.enum(['high-potential', 'medium-potential', 'low-potential']).optional(),
        websiteStatus: zod_1.z.enum(['no-website', 'broken-website', 'outdated-website', 'average-website', 'modern-website']).optional(),
        category: zod_1.z.string().optional(),
        minLeadScore: zod_1.z.coerce.number().optional(),
        maxLeadScore: zod_1.z.coerce.number().optional(),
        search: zod_1.z.string().optional(),
    }).optional(),
});
const exportSearchSchema = zod_1.z.object({
    body: zod_1.z.object({
        keyword: zod_1.z.string().min(1, 'Keyword is required'),
        location: zod_1.z.string().min(1, 'Location is required'),
    }),
    query: zod_1.z.object({
        qualificationLevel: zod_1.z.enum(['high-potential', 'medium-potential', 'low-potential']).optional(),
        websiteStatus: zod_1.z.enum(['no-website', 'broken-website', 'outdated-website', 'average-website', 'modern-website']).optional(),
        category: zod_1.z.string().optional(),
        format: zod_1.z.enum(['csv', 'excel']).optional().default('excel'),
        minLeadScore: zod_1.z.coerce.number().optional(),
        maxLeadScore: zod_1.z.coerce.number().optional(),
    }).optional(),
});
router.get('/csv', (0, validations_1.validate)(csvExportSchema), (req, res, next) => {
    exporter_controller_1.exporterController.exportToCSV(req, res, next);
});
router.get('/excel', (0, validations_1.validate)(excelExportSchema), (req, res, next) => {
    exporter_controller_1.exporterController.exportToExcel(req, res, next);
});
router.post('/search', (0, validations_1.validate)(exportSearchSchema), (req, res, next) => {
    exporter_controller_1.exporterController.exportSearchResults(req, res, next);
});
router.get('/detailed', (req, res, next) => {
    exporter_controller_1.exporterController.exportWithFormatting(req, res, next);
});
exports.default = router;
//# sourceMappingURL=export.route.js.map