"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScraperSession = void 0;
const uuid_1 = require("uuid");
const logger_1 = require("../utils/logger");
class ScraperSession {
    constructor(keyword, location, limit) {
        this.status = 'pending';
        this.retryCount = 0;
        this.id = (0, uuid_1.v4)();
        this.keyword = keyword;
        this.location = location;
        this.limit = limit;
        this.startTime = new Date();
    }
    start() {
        this.status = 'running';
        this.retryCount = 0;
        logger_1.logger.info(`ScraperSession ${this.id}: Started for "${this.keyword}" in "${this.location}"`);
    }
    complete(result) {
        this.status = 'completed';
        this.endTime = new Date();
        this.result = result;
        logger_1.logger.info(`ScraperSession ${this.id}: Completed with ${result.totalStored} leads`);
    }
    fail(error) {
        this.status = 'failed';
        this.endTime = new Date();
        this.error = error;
        logger_1.logger.error(`ScraperSession ${this.id}: Failed - ${error}`);
    }
    incrementRetry() {
        this.retryCount++;
    }
    getDuration() {
        if (!this.endTime) {
            return 0;
        }
        return (this.endTime.getTime() - this.startTime.getTime()) / 1000;
    }
    getInfo() {
        return {
            id: this.id,
            keyword: this.keyword,
            location: this.location,
            limit: this.limit,
            startTime: this.startTime,
            endTime: this.endTime,
            status: this.status,
            result: this.result,
            error: this.error,
            retryCount: this.retryCount,
        };
    }
}
exports.ScraperSession = ScraperSession;
//# sourceMappingURL=scraper-session.js.map