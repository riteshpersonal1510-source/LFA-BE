"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.outreachHistoryService = exports.OutreachHistoryService = void 0;
const Lead_1 = require("../models/Lead");
const logger_1 = require("../utils/logger");
class OutreachHistoryService {
    async addEntry(leadId, entry) {
        try {
            await Lead_1.Lead.findByIdAndUpdate(leadId, {
                $push: { outreachHistory: entry },
                $set: {
                    lastOutreachDate: new Date(),
                    crmOutreachStatus: this.getCRMStatus(entry.type),
                },
            });
            logger_1.logger.info(`Outreach history entry added for lead ${leadId}: ${entry.type}`);
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), `Failed to add outreach history for lead ${leadId}:`);
        }
    }
    async updateStatus(leadId, entryId, status, response) {
        try {
            const update = {
                'outreachHistory.$.status': status,
            };
            if (response) {
                update['outreachHistory.$.response'] = response;
            }
            await Lead_1.Lead.findOneAndUpdate({ _id: leadId, 'outreachHistory._id': entryId }, { $set: update });
            logger_1.logger.info(`Outreach status updated for lead ${leadId}: ${status}`);
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), `Failed to update outreach status for lead ${leadId}:`);
        }
    }
    async getHistory(leadId) {
        try {
            const lead = await Lead_1.Lead.findById(leadId).lean();
            if (!lead || !lead.outreachHistory)
                return [];
            return lead.outreachHistory;
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), `Failed to get outreach history for lead ${leadId}:`);
            return [];
        }
    }
    getCRMStatus(type) {
        switch (type) {
            case 'email': return 'email_sent';
            case 'whatsapp': return 'whatsapp_sent';
            case 'proposal': return 'proposal_sent';
            case 'followup': return 'followup_pending';
            default: return 'outreach_pending';
        }
    }
}
exports.OutreachHistoryService = OutreachHistoryService;
exports.outreachHistoryService = new OutreachHistoryService();
//# sourceMappingURL=outreach-history.service.js.map