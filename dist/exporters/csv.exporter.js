"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.csvExporter = exports.CSVExporter = void 0;
const csvWriter = __importStar(require("csv-write-stream"));
const fs_1 = require("fs");
const stream_1 = require("stream");
const util_1 = require("util");
const Lead_1 = require("../models/Lead");
const logger_1 = require("../utils/logger");
const streamPipeline = (0, util_1.promisify)(stream_1.pipeline);
class CSVExporter {
    constructor() {
        this.defaultFilename = 'leads_export';
    }
    async exportToCSV(options = {}) {
        const { qualificationLevel, websiteStatus, category, minLeadScore, maxLeadScore, search, filename = this.defaultFilename, filePath = './exports' } = options;
        logger_1.logger.info(`CSVExporter: Starting export with filters: ${JSON.stringify(options)}`);
        const query = this.buildQuery({
            qualificationLevel,
            websiteStatus,
            category,
            minLeadScore,
            maxLeadScore,
            search
        });
        const leads = await Lead_1.Lead.find(query)
            .lean()
            .select({
            companyName: 1,
            website: 1,
            phone: 1,
            email: 1,
            address: 1,
            category: 1,
            websiteStatus: 1,
            leadScore: 1,
            qualificationLevel: 1,
            sslEnabled: 1,
            source: 1,
            rating: 1,
            createdAt: 1,
            searchedKeyword: 1,
            searchedLocation: 1,
        });
        if (!leads || leads.length === 0) {
            logger_1.logger.warn('CSVExporter: No leads found for export');
            throw new Error('No leads found to export');
        }
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        if (!fs.existsSync(filePath)) {
            fs.mkdirSync(filePath, { recursive: true });
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filepath = `${filePath}/${filename}_${timestamp}.csv`;
        const columns = [
            { label: 'Company Name', value: 'companyName' },
            { label: 'Website', value: 'website' },
            { label: 'Phone', value: 'phone' },
            { label: 'Email', value: 'email' },
            { label: 'Address', value: 'address' },
            { label: 'Category', value: 'category' },
            { label: 'Website Status', value: 'websiteStatus' },
            { label: 'Lead Score', value: 'leadScore' },
            { label: 'Qualification Level', value: 'qualificationLevel' },
            { label: 'SSL Status', value: 'sslEnabled' },
            { label: 'Source', value: 'source' },
            { label: 'Rating', value: 'rating' },
            { label: 'Created At', value: 'createdAt' },
            { label: 'Searched Keyword', value: 'searchedKeyword' },
            { label: 'Searched Location', value: 'searchedLocation' },
        ];
        const writeStream = (0, fs_1.createWriteStream)(filepath);
        const csvStream = new csvWriter({
            headers: columns.map(col => col.label),
            sendHeaders: true,
        });
        const csvData = leads.map(lead => {
            const row = {};
            columns.forEach(col => {
                const value = lead[col.value];
                if (typeof value === 'boolean') {
                    row[col.label] = value ? 'Yes' : 'No';
                }
                else if (value instanceof Date) {
                    row[col.label] = value.toISOString();
                }
                else {
                    row[col.label] = value || '';
                }
            });
            return row;
        });
        await streamPipeline(csvStream, writeStream);
        csvData.forEach(row => csvStream.write(row));
        csvStream.end();
        await new Promise((resolve, reject) => {
            writeStream.on('finish', () => resolve());
            writeStream.on('error', reject);
        });
        logger_1.logger.info(`CSVExporter: Exported ${csvData.length} leads to ${filepath}`);
        return {
            filepath,
            rowCount: csvData.length,
        };
    }
    async exportToStream(res, options) {
        logger_1.logger.info('CSVExporter: Starting stream export');
        const query = this.buildQuery(options);
        const leads = await Lead_1.Lead.find(query)
            .lean()
            .select({
            companyName: 1,
            website: 1,
            phone: 1,
            email: 1,
            address: 1,
            category: 1,
            websiteStatus: 1,
            leadScore: 1,
            qualificationLevel: 1,
            sslEnabled: 1,
            source: 1,
            rating: 1,
            createdAt: 1,
            searchedKeyword: 1,
            searchedLocation: 1,
        });
        if (!leads || leads.length === 0) {
            res.status(404).json({
                success: false,
                message: 'No leads found to export',
            });
            return;
        }
        const columns = [
            { label: 'Company Name', value: 'companyName' },
            { label: 'Website', value: 'website' },
            { label: 'Phone', value: 'phone' },
            { label: 'Email', value: 'email' },
            { label: 'Address', value: 'address' },
            { label: 'Category', value: 'category' },
            { label: 'Website Status', value: 'websiteStatus' },
            { label: 'Lead Score', value: 'leadScore' },
            { label: 'Qualification Level', value: 'qualificationLevel' },
            { label: 'SSL Status', value: 'sslEnabled' },
            { label: 'Source', value: 'source' },
            { label: 'Rating', value: 'rating' },
            { label: 'Created At', value: 'createdAt' },
            { label: 'Searched Keyword', value: 'searchedKeyword' },
            { label: 'Searched Location', value: 'searchedLocation' },
        ];
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=leads_export_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`);
        res.write(columns.map(col => `"${col.label}"`).join(',') + '\n');
        leads.forEach(lead => {
            const row = columns.map(col => {
                const value = lead[col.value];
                if (typeof value === 'boolean') {
                    return value ? 'Yes' : 'No';
                }
                else if (value instanceof Date) {
                    return `"${value.toISOString()}"`;
                }
                else {
                    return `"${(value || '').toString().replace(/"/g, '""')}"`;
                }
            }).join(',');
            res.write(row + '\n');
        });
        res.end();
        logger_1.logger.info(`CSVExporter: Stream export completed for ${leads.length} leads`);
    }
    buildQuery(filters) {
        const query = {};
        if (filters.qualificationLevel) {
            query.qualificationLevel = filters.qualificationLevel;
        }
        if (filters.websiteStatus) {
            query.websiteStatus = filters.websiteStatus;
        }
        if (filters.category) {
            query.category = { $regex: filters.category, $options: 'i' };
        }
        if (filters.minLeadScore !== undefined) {
            query.leadScore = { ...(query.leadScore || {}), $gte: filters.minLeadScore };
        }
        if (filters.maxLeadScore !== undefined) {
            query.leadScore = { ...(query.leadScore || {}), $lte: filters.maxLeadScore };
        }
        if (filters.search) {
            query.$or = [
                { companyName: { $regex: filters.search, $options: 'i' } },
                { phone: { $regex: filters.search } },
                { email: { $regex: filters.search, $options: 'i' } },
                { website: { $regex: filters.search, $options: 'i' } },
            ];
        }
        if (filters.keyword) {
            query.$or = [
                { companyName: { $regex: filters.keyword, $options: 'i' } },
                { website: { $regex: filters.keyword, $options: 'i' } },
                { phone: { $regex: filters.keyword } },
                { address: { $regex: filters.keyword, $options: 'i' } },
                { category: { $regex: filters.keyword, $options: 'i' } },
            ];
        }
        if (filters.location) {
            const locationQuery = [
                { address: { $regex: filters.location, $options: 'i' } },
                { companyName: { $regex: filters.location, $options: 'i' } },
                { category: { $regex: filters.location, $options: 'i' } },
            ];
            if (query.$or) {
                query.$and = [{ $or: query.$or }, { $or: locationQuery }];
                delete query.$or;
            }
            else {
                query.$or = locationQuery;
            }
        }
        if (filters.source) {
            query.source = filters.source;
        }
        if (filters.sources) {
            query.source = { $in: filters.sources.split(',') };
        }
        if (filters.hasWebsite === 'true') {
            query.website = { $exists: true, $nin: [null, ''] };
        }
        else if (filters.hasWebsite === 'false') {
            query.$and = [
                ...(query.$and || []),
                { $or: [{ website: { $exists: false } }, { website: null }, { website: '' }] },
            ];
        }
        if (filters.hasPhone === 'true') {
            query.phone = { $exists: true, $nin: [null, ''] };
        }
        else if (filters.hasPhone === 'false') {
            query.$and = [
                ...(query.$and || []),
                { $or: [{ phone: { $exists: false } }, { phone: null }, { phone: '' }] },
            ];
        }
        return query;
    }
    async exportFromSearch(keyword, location, options) {
        logger_1.logger.info(`CSVExporter: Exporting search results for "${keyword}" in "${location}"`);
        const { ScraperService } = await Promise.resolve().then(() => __importStar(require('./../services/scraper.service')));
        const scraper = new ScraperService();
        await scraper.scrapeBusinesses({
            keyword,
            location,
            sources: ['google-maps'],
            limit: 100,
        });
        const exportOptions = {
            ...options,
            search: keyword,
        };
        return this.exportToCSV(exportOptions);
    }
}
exports.CSVExporter = CSVExporter;
exports.csvExporter = new CSVExporter();
//# sourceMappingURL=csv.exporter.js.map