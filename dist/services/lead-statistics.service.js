"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadStatisticsService = exports.LeadStatisticsService = void 0;
const Lead_1 = require("../models/Lead");
const logger_1 = require("../utils/logger");
class LeadStatisticsService {
    constructor() {
        this.baseQuery = {};
    }
    async getLeadStatistics() {
        const startTime = Date.now();
        this.baseQuery = {};
        const appliedFilters = [];
        logger_1.logger.info({ query: this.baseQuery, filters: appliedFilters }, '[LeadStatistics] Building base query');
        const [total, websiteCount, noWebsiteCount, withPhoneCount, withoutPhoneCount, statusStats, allLeadIds] = await Promise.all([
            Lead_1.Lead.countDocuments(this.baseQuery),
            Lead_1.Lead.countDocuments({
                ...this.baseQuery,
                hasRealWebsite: true,
            }),
            Lead_1.Lead.countDocuments({
                ...this.baseQuery,
                $or: [
                    { hasRealWebsite: { $ne: true } },
                    { hasRealWebsite: { $exists: false } },
                ],
            }),
            Lead_1.Lead.countDocuments({
                ...this.baseQuery,
                phone: { $exists: true, $nin: [null, ''] },
            }),
            Lead_1.Lead.countDocuments({
                ...this.baseQuery,
                $or: [
                    { phone: { $exists: false } },
                    { phone: null },
                    { phone: '' },
                ],
            }),
            Lead_1.Lead.aggregate([
                {
                    $match: this.baseQuery,
                },
                {
                    $group: {
                        _id: { $ifNull: ['$whatsappOutreach.status', 'pending'] },
                        count: { $sum: 1 },
                    },
                },
            ]),
            Lead_1.Lead.find(this.baseQuery)
                .select('_id')
                .lean()
                .then((docs) => docs.map((d) => d._id.toString())),
        ]);
        const statusMap = {
            pending: 0,
            prepared: 0,
            manually_sent: 0,
            skipped: 0,
            failed: 0,
        };
        for (const stat of statusStats) {
            const key = stat._id;
            if (key in statusMap) {
                statusMap[key] = stat.count;
            }
        }
        const duration = Date.now() - startTime;
        const result = {
            totalLeads: total,
            websiteCount,
            noWebsiteCount,
            withPhoneCount,
            withoutPhoneCount,
            pendingCount: statusMap.pending,
            preparedCount: statusMap.prepared,
            sentCount: statusMap.manually_sent,
            skippedCount: statusMap.skipped,
            failedCount: statusMap.failed,
            leadIds: allLeadIds,
            mongoQuery: this.baseQuery,
            appliedFilters,
        };
        logger_1.logger.info({
            total,
            websiteCount,
            noWebsiteCount,
            withPhoneCount,
            withoutPhoneCount,
            pending: statusMap.pending,
            prepared: statusMap.prepared,
            sent: statusMap.manually_sent,
            skipped: statusMap.skipped,
            failed: statusMap.failed,
            leadCount: allLeadIds.length,
            durationMs: duration,
            mongoQuery: this.baseQuery,
            appliedFilters,
        }, '[LeadStatistics] Statistics calculated');
        return result;
    }
}
exports.LeadStatisticsService = LeadStatisticsService;
exports.leadStatisticsService = new LeadStatisticsService();
//# sourceMappingURL=lead-statistics.service.js.map