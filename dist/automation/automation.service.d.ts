import { IAutomation, IJobExecution, IExportHistory } from '../models/Automation';
export interface AutomationCreateOptions {
    keyword: string;
    location: string;
    frequency: 'hourly' | 'daily' | 'weekly';
    limit?: number;
    category?: string;
}
export interface AutomationUpdateOptions {
    keyword?: string;
    location?: string;
    frequency?: 'hourly' | 'daily' | 'weekly';
    limit?: number;
    category?: string;
    status?: 'active' | 'paused';
}
export declare class AutomationService {
    createAutomation(options: AutomationCreateOptions): Promise<IAutomation>;
    getAllAutomations(options?: {
        page?: number;
        limit?: number;
        status?: 'active' | 'paused' | 'failed';
        keyword?: string;
    }): Promise<{
        automations: IAutomation[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getAutomationById(id: string): Promise<IAutomation | null>;
    updateAutomation(id: string, options: AutomationUpdateOptions): Promise<IAutomation | null>;
    toggleAutomation(id: string): Promise<IAutomation | null>;
    deleteAutomation(id: string): Promise<void>;
    runAutomation(id: string): Promise<{
        success: boolean;
        totalLeads: number;
        totalAnalyzed: number;
        totalExtracted: number;
        errors: string[];
    }>;
    getAutomationLogs(id: string, options?: {
        page?: number;
        limit?: number;
        jobType?: string;
    }): Promise<{
        logs: IJobExecution[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getAutomationStatistics(id: string): Promise<{
        totalRuns: number;
        successfulRuns: number;
        failedRuns: number;
        avgLeadsPerRun: number;
        totalLeadsGenerated: number;
        lastRunAt?: Date;
        nextRunAt?: Date;
    }>;
    getExportHistory(id: string, options?: {
        page?: number;
        limit?: number;
        exportType?: 'csv' | 'excel';
    }): Promise<{
        exports: IExportHistory[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
}
export declare const automationService: AutomationService;
//# sourceMappingURL=automation.service.d.ts.map