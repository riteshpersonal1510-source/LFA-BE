"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const contact_extractor_controller_1 = require("../controllers/contact-extractor.controller");
const zod_1 = require("zod");
const validations_1 = require("../utils/validations");
const router = (0, express_1.Router)();
const extractionSchema = zod_1.z.object({
    body: zod_1.z.object({
        leadId: zod_1.z.string().min(1, 'leadId is required'),
    }),
});
const bulkExtractionSchema = zod_1.z.object({
    body: zod_1.z.object({
        limit: zod_1.z.number().min(1).max(100).optional().default(50),
    }),
});
router.post('/', (0, validations_1.validate)(extractionSchema), (req, res, next) => {
    contact_extractor_controller_1.contactExtractorController.extractContacts(req, res, next);
});
router.post('/bulk', (0, validations_1.validate)(bulkExtractionSchema), (req, res, next) => {
    contact_extractor_controller_1.contactExtractorController.bulkExtractContacts(req, res, next);
});
router.post('/crawl', (0, validations_1.validate)(extractionSchema), (req, res, next) => {
    contact_extractor_controller_1.contactExtractorController.crawlWebsite(req, res, next);
});
router.post('/social', (0, validations_1.validate)(extractionSchema), (req, res, next) => {
    contact_extractor_controller_1.contactExtractorController.extractSocialLinks(req, res, next);
});
router.post('/owner', (0, validations_1.validate)(extractionSchema), (req, res, next) => {
    contact_extractor_controller_1.contactExtractorController.detectOwner(req, res, next);
});
router.post('/contact-pages', (0, validations_1.validate)(extractionSchema), (req, res, next) => {
    contact_extractor_controller_1.contactExtractorController.detectContactPages(req, res, next);
});
router.post('/full', (0, validations_1.validate)(extractionSchema), (req, res, next) => {
    contact_extractor_controller_1.contactExtractorController.fullExtraction(req, res, next);
});
exports.default = router;
//# sourceMappingURL=contact-extraction.route.js.map