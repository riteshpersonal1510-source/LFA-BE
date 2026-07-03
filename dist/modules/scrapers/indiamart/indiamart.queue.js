"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndiaMartProfileQueue = void 0;
const p_limit_1 = __importDefault(require("p-limit"));
const logger_1 = require("../../../utils/logger");
const indiamart_profile_1 = require("./indiamart.profile");
const indiamart_validator_1 = require("./indiamart.validator");
const indiamart_normalizer_1 = require("./indiamart.normalizer");
const CONCURRENCY = 3;
class IndiaMartProfileQueue {
    constructor(page, context) {
        this.results = [];
        this.failed = [];
        this.limit = (0, p_limit_1.default)(CONCURRENCY);
        this.page = page;
        this.results = [];
        this.failed = [];
        this.context = context;
        this.stats = {
            totalListingsFound: 0,
            totalProfilesOpened: 0,
            totalProfilesFailed: 0,
            totalLeadsSaved: 0,
            totalDuplicatesSkipped: 0,
            totalInvalidRejected: 0,
            errors: [],
        };
    }
    async processAll(listings) {
        this.stats.totalListingsFound = listings.length;
        if (listings.length === 0) {
            return { leads: [], stats: this.stats };
        }
        logger_1.logger.info({
            total: listings.length,
            concurrency: CONCURRENCY,
        }, 'IndiaMartQueue: Processing profiles');
        const tasks = listings.map(listing => this.limit(() => this.processSingle(listing)));
        await Promise.allSettled(tasks);
        logger_1.logger.info({
            total: listings.length,
            opened: this.stats.totalProfilesOpened,
            saved: this.stats.totalLeadsSaved,
            failed: this.stats.totalProfilesFailed,
            duplicates: this.stats.totalDuplicatesSkipped,
            invalid: this.stats.totalInvalidRejected,
        }, 'IndiaMartQueue: All profiles processed');
        return { leads: this.results, stats: this.stats };
    }
    async processSingle(listing) {
        const enriched = await (0, indiamart_profile_1.crawlProfile)(this.page, listing.profileUrl, listing.companyName);
        if (!enriched) {
            this.stats.totalProfilesFailed++;
            this.failed.push(listing.profileUrl);
            return;
        }
        this.stats.totalProfilesOpened++;
        const validation = await (0, indiamart_validator_1.validateLead)(enriched);
        if (!validation.valid) {
            this.stats.totalInvalidRejected++;
            logger_1.logger.info({
                company: enriched.companyName,
                reason: validation.reason,
            }, 'IndiaMartQueue: Lead rejected');
            return;
        }
        const scraperLead = (0, indiamart_normalizer_1.enrichToScraperLead)(enriched, this.context);
        scraperLead.relevanceScore = (0, indiamart_normalizer_1.computeLeadScore)(scraperLead);
        this.results.push(scraperLead);
        this.stats.totalLeadsSaved++;
        logger_1.logger.info({
            company: scraperLead.companyName,
            phone: scraperLead.phone,
            website: scraperLead.website,
        }, 'IndiaMartQueue: Lead ready');
    }
    getResults() {
        return this.results;
    }
    getStats() {
        return this.stats;
    }
    getFailed() {
        return this.failed;
    }
}
exports.IndiaMartProfileQueue = IndiaMartProfileQueue;
//# sourceMappingURL=indiamart.queue.js.map