"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const lead_migration_service_1 = require("../services/lead-migration.service");
const api_response_1 = require("../utils/api-response");
const logger_1 = require("../utils/logger");
const v2_fix_all_website_classifications_1 = require("../migrations/v2-fix-all-website-classifications");
const router = (0, express_1.Router)();
router.post('/reclassify-all', async (_req, res) => {
    try {
        logger_1.logger.info('[Migration] Starting reclassify-all...');
        const result = await lead_migration_service_1.leadMigrationService.reclassifyAllLeads(100);
        api_response_1.APIResponse.success(res, {
            message: 'Reclassification complete',
            stats: result,
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, '[Migration] Reclassify-all failed');
        api_response_1.APIResponse.error(res, 'Reclassification failed');
    }
});
router.get('/stats', async (_req, res) => {
    try {
        const stats = await lead_migration_service_1.leadMigrationService.getClassificationStats();
        api_response_1.APIResponse.success(res, stats);
    }
    catch (error) {
        logger_1.logger.error({ error }, '[Migration] Stats fetch failed');
        api_response_1.APIResponse.error(res, 'Failed to get stats');
    }
});
router.post('/migrate-website-detection', async (_req, res) => {
    try {
        logger_1.logger.info('[Migration] Starting website detection field migration...');
        const result = await lead_migration_service_1.leadMigrationService.migrateWebsiteDetectionFields(200);
        api_response_1.APIResponse.success(res, {
            message: 'Website detection migration complete',
            stats: result,
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, '[Migration] Website detection migration failed');
        api_response_1.APIResponse.error(res, 'Website detection migration failed');
    }
});
router.post('/v2-fix-all-websites', async (_req, res) => {
    try {
        logger_1.logger.info('[Migration] Starting v2 website classification fix...');
        const result = await (0, v2_fix_all_website_classifications_1.fixAllWebsiteClassifications)(200);
        api_response_1.APIResponse.success(res, {
            message: 'v2 website classification fix complete',
            stats: result,
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, '[Migration] v2 website classification fix failed');
        api_response_1.APIResponse.error(res, 'v2 website classification fix failed');
    }
});
exports.default = router;
//# sourceMappingURL=migration.route.js.map