import { IJobExecution } from '../models/Automation';
export interface AutomationWorkflow {
    id: string;
    keyword: string;
    location: string;
    limit: number;
    category?: string;
}
export declare class WorkflowManager {
    executeWorkflow(automationId: string, options: {
        keyword: string;
        location: string;
        limit: number;
        category?: string;
        triggerType: 'manual' | 'api' | 'scheduled';
    }): Promise<{
        success: boolean;
        totalLeads: number;
        totalAnalyzed: number;
        totalExtracted: number;
        errors: string[];
    }>;
    getExecutionHistory(automationId: string, options?: {
        page?: number;
        limit?: number;
    }): Promise<{
        executions: IJobExecution[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getStatistics(automationId: string): Promise<{
        totalRuns: number;
        successfulRuns: number;
        failedRuns: number;
        avgLeadsPerRun: number;
        totalLeadsGenerated: number;
        lastRunAt?: Date;
        nextRunAt?: Date;
    }>;
    pauseAutomation(automationId: string): Promise<void>;
    resumeAutomation(automationId: string): Promise<void>;
    deleteAutomation(automationId: string): Promise<void>;
}
export declare const workflowManager: WorkflowManager;
//# sourceMappingURL=workflow-manager.d.ts.map