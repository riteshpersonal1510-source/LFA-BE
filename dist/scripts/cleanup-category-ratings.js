"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Lead_1 = require("../models/Lead");
const database_1 = require("../config/database");
const logger_1 = require("../utils/logger");
const RATING_PATTERN = /^\d+(\.\d+)?$/;
async function cleanupCategoryField() {
    await (0, database_1.connectDB)();
    const allBadDocs = await Lead_1.Lead.find({
        category: { $regex: RATING_PATTERN, $options: '' },
    }).lean();
    const badCount = allBadDocs.length;
    logger_1.logger.info(`Found ${badCount} leads with numeric/rating values in category field`);
    if (badCount === 0) {
        logger_1.logger.info('No cleanup needed. Category field is clean.');
        await (0, database_1.disconnectDB)();
        return;
    }
    const sampleBad = allBadDocs.slice(0, 5).map((l) => ({
        companyName: l.companyName,
        category: l.category,
        rating: l.rating,
    }));
    logger_1.logger.info({ sampleBad }, 'Sample bad leads');
    const updateResult = await Lead_1.Lead.updateMany({ category: { $regex: RATING_PATTERN, $options: '' } }, { $unset: { category: '' } });
    logger_1.logger.info(`Cleaned ${updateResult.modifiedCount} leads — removed rating values from category field`);
    await (0, database_1.disconnectDB)();
}
cleanupCategoryField().catch((err) => {
    logger_1.logger.error({ err }, 'Category cleanup failed');
    process.exit(1);
});
//# sourceMappingURL=cleanup-category-ratings.js.map