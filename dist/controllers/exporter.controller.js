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
exports.exporterController = exports.ExporterController = void 0;
const csv_exporter_1 = require("../exporters/csv.exporter");
const excel_exporter_1 = require("../exporters/excel.exporter");
const api_response_1 = require("../utils/api-response");
const logger_1 = require("../utils/logger");
class ExporterController {
    async exportToCSV(req, res, next) {
        try {
            const filters = {
                qualificationLevel: req.query.qualificationLevel,
                websiteStatus: req.query.websiteStatus,
                category: req.query.category?.toString(),
                minLeadScore: req.query.minLeadScore ? parseFloat(req.query.minLeadScore.toString()) : undefined,
                maxLeadScore: req.query.maxLeadScore ? parseFloat(req.query.maxLeadScore.toString()) : undefined,
                search: req.query.search?.toString(),
                keyword: req.query.keyword?.toString(),
                location: req.query.location?.toString(),
                source: req.query.source?.toString(),
                sources: req.query.sources?.toString(),
                hasWebsite: req.query.hasWebsite?.toString(),
                hasPhone: req.query.hasPhone?.toString(),
            };
            logger_1.logger.info(`ExporterController: Starting CSV export with filters: ${JSON.stringify(filters)}`);
            await csv_exporter_1.csvExporter.exportToStream(res, filters);
        }
        catch (error) {
            next(error);
        }
    }
    async exportToExcel(req, res, next) {
        try {
            const filters = {
                qualificationLevel: req.query.qualificationLevel,
                websiteStatus: req.query.websiteStatus,
                category: req.query.category?.toString(),
                minLeadScore: req.query.minLeadScore ? parseFloat(req.query.minLeadScore.toString()) : undefined,
                maxLeadScore: req.query.maxLeadScore ? parseFloat(req.query.maxLeadScore.toString()) : undefined,
                search: req.query.search?.toString(),
                keyword: req.query.keyword?.toString(),
                location: req.query.location?.toString(),
                source: req.query.source?.toString(),
                sources: req.query.sources?.toString(),
                hasWebsite: req.query.hasWebsite?.toString(),
                hasPhone: req.query.hasPhone?.toString(),
            };
            logger_1.logger.info(`ExporterController: Starting Excel export with filters: ${JSON.stringify(filters)}`);
            await excel_exporter_1.excelExporter.exportToStream(res, filters);
        }
        catch (error) {
            next(error);
        }
    }
    async exportWithFormatting(req, res, next) {
        try {
            const filters = {
                qualificationLevel: req.query.qualificationLevel,
                websiteStatus: req.query.websiteStatus,
                category: req.query.category?.toString(),
                minLeadScore: req.query.minLeadScore ? parseFloat(req.query.minLeadScore.toString()) : undefined,
                maxLeadScore: req.query.maxLeadScore ? parseFloat(req.query.maxLeadScore.toString()) : undefined,
                search: req.query.search?.toString(),
            };
            const result = await excel_exporter_1.excelExporter.exportWithFormatting({
                ...filters,
                filename: 'leads_detailed_export',
            });
            api_response_1.APIResponse.success(res, {
                filepath: result.filepath,
                rowCount: result.rowCount,
            }, 'Excel file exported successfully', 200);
        }
        catch (error) {
            next(error);
        }
    }
    async exportSearchResults(req, res, next) {
        try {
            const { keyword, location } = req.body;
            if (!keyword || !location) {
                api_response_1.APIResponse.error(res, 'Keyword and location are required', null, 400);
                return;
            }
            const filters = {
                qualificationLevel: req.query.qualificationLevel,
                websiteStatus: req.query.websiteStatus,
                category: req.query.category?.toString(),
                minLeadScore: req.query.minLeadScore ? parseFloat(req.query.minLeadScore.toString()) : undefined,
                maxLeadScore: req.query.maxLeadScore ? parseFloat(req.query.maxLeadScore.toString()) : undefined,
            };
            const format = req.query.format?.toString() === 'csv' ? 'csv' : 'excel';
            if (format === 'csv') {
                const { ScraperService } = await Promise.resolve().then(() => __importStar(require('../services/scraper.service')));
                const scraper = new ScraperService();
                await scraper.scrapeBusinesses({
                    keyword,
                    location,
                    sources: ['google-maps'],
                    limit: 100,
                });
                const searchFilters = {
                    ...filters,
                    search: keyword,
                };
                await csv_exporter_1.csvExporter.exportToStream(res, searchFilters);
            }
            else {
                const result = await excel_exporter_1.excelExporter.exportWithFormatting({
                    ...filters,
                    search: keyword,
                    filename: `search_${keyword}_${location}`,
                });
                api_response_1.APIResponse.success(res, {
                    filepath: result.filepath,
                    rowCount: result.rowCount,
                }, 'Excel export completed successfully', 200);
            }
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ExporterController = ExporterController;
exports.exporterController = new ExporterController();
//# sourceMappingURL=exporter.controller.js.map