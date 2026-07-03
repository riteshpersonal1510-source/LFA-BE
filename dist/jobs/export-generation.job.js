"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportGenerationJob = exports.ExportGenerationJob = void 0;
const logger_1 = require("../utils/logger");
const Automation_1 = require("../models/Automation");
const exporters_1 = require("../exporters");
const Automation_2 = require("../models/Automation");
class ExportGenerationJob {
    async execute(options) {
        const { automationId, exportType, filters } = options;
        logger_1.logger.info(`ExportGenerationJob: Starting ${exportType} export`);
        const jobExecution = await this.createJobExecution(automationId, 'export-generation', {
            exportType,
            filters,
        });
        try {
            let result;
            let exportPath;
            let fileName;
            if (exportType === 'csv') {
                result = await exporters_1.csvExporter.exportToCSV({
                    ...filters,
                    filename: `automation_export_${Date.now()}`,
                    filePath: './exports',
                });
                exportPath = result.filepath;
                fileName = `automation_export_${Date.now()}.csv`;
            }
            else {
                result = await exporters_1.excelExporter.exportWithFormatting({
                    ...filters,
                    filename: `automation_export_${Date.now()}`,
                    filePath: './exports',
                });
                exportPath = result.filepath;
                fileName = `automation_export_${Date.now()}.xlsx`;
            }
            await this.updateJobExecution(jobExecution.id, {
                status: 'completed',
                totalLeadsGenerated: result.rowCount,
                metadata: {
                    exportPath,
                    fileName,
                },
                completedAt: new Date(),
            });
            const exportHistory = new Automation_1.ExportHistory({
                automationId,
                exportType,
                filePath: exportPath,
                fileName,
                generatedAt: new Date(),
                totalRecords: result.rowCount,
            });
            await exportHistory.save();
            logger_1.logger.info(`ExportGenerationJob: Completed - ${exportPath} generated`);
            return {
                success: true,
                exportPath,
                fileName,
                totalRecords: result.rowCount,
                errors: [],
            };
        }
        catch (error) {
            logger_1.logger.error('ExportGenerationJob: Failed:', error);
            await this.updateJobExecution(jobExecution.id, {
                status: 'failed',
                failedCount: 1,
                error: error.message,
                completedAt: new Date(),
            });
            return {
                success: false,
                exportPath: '',
                fileName: '',
                totalRecords: 0,
                errors: [error.message],
            };
        }
    }
    async createJobExecution(automationId, jobType, metadata) {
        const jobExecution = new Automation_2.JobExecution({
            automationId,
            jobType,
            status: 'running',
            startedAt: new Date(),
            metadata,
            logs: [],
        });
        return await jobExecution.save();
    }
    async updateJobExecution(jobExecutionId, updates) {
        await Automation_2.JobExecution.findByIdAndUpdate(jobExecutionId, updates);
    }
}
exports.ExportGenerationJob = ExportGenerationJob;
exports.exportGenerationJob = new ExportGenerationJob();
//# sourceMappingURL=export-generation.job.js.map