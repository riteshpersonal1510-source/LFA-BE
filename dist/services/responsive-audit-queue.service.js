"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.responsiveAuditQueueService = void 0;
const events_1 = require("events");
const Lead_1 = require("../models/Lead");
const logger_1 = require("../utils/logger");
const responsive_audit_service_1 = require("./responsive-audit.service");
const p_limit_1 = __importDefault(require("p-limit"));
class ResponsiveAuditQueueService extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.isProcessing = false;
        this.limit = (0, p_limit_1.default)(2);
        this.batchSize = 10;
    }
    async startProcessing() {
        if (this.isProcessing) {
            logger_1.logger.info('Responsive audit queue already processing');
            return;
        }
        this.isProcessing = true;
        logger_1.logger.info('Starting responsive audit queue processing');
        while (this.isProcessing) {
            try {
                const leads = await this.getLeadsToAudit();
                if (leads.length === 0) {
                    logger_1.logger.info('No leads to audit, waiting...');
                    await this.sleep(60000);
                    continue;
                }
                logger_1.logger.info(`Processing ${leads.length} leads for responsive audit`);
                await Promise.all(leads.map(lead => this.limit(async () => {
                    try {
                        await responsive_audit_service_1.responsiveAuditService.auditLead(lead._id.toString(), {
                            timeout: 30000,
                            skipScreenshots: false,
                            screenshotQuality: 80,
                        });
                    }
                    catch (error) {
                        logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), `Failed to audit lead ${lead._id}:`);
                    }
                })));
                await this.sleep(5000);
            }
            catch (error) {
                logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'Error in responsive audit queue:');
                await this.sleep(10000);
            }
        }
    }
    stopProcessing() {
        this.isProcessing = false;
        logger_1.logger.info('Stopping responsive audit queue processing');
    }
    async getLeadsToAudit() {
        try {
            const leads = await Lead_1.Lead.find({
                website: { $exists: true, $nin: [null, ''] },
                analyzedAt: { $exists: true },
                responsiveAuditCompleted: { $ne: true },
            })
                .sort({ analyzedAt: -1 })
                .limit(this.batchSize)
                .select('_id website')
                .lean();
            return leads;
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to get leads to audit:');
            return [];
        }
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.responsiveAuditQueueService = new ResponsiveAuditQueueService();
//# sourceMappingURL=responsive-audit-queue.service.js.map