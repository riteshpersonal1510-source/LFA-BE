import { Document, Types } from 'mongoose';
export type AutomationFrequency = 'hourly' | 'daily' | 'weekly';
export type AutomationStatus = 'active' | 'paused' | 'failed';
export interface IAutomation extends Document {
    keyword: string;
    location: string;
    frequency: AutomationFrequency;
    limit: number;
    category?: string;
    status: AutomationStatus;
    lastRunAt?: Date;
    nextRunAt?: Date;
    totalRuns: number;
    lastRunLeads: number;
    lastRunStatus: 'success' | 'partial' | 'failed';
    error?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Automation: import("mongoose").Model<IAutomation, {}, {}, {}, Document<unknown, {}, IAutomation, {}, {}> & IAutomation & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export interface IJobExecution extends Document {
    automationId: Types.ObjectId;
    jobType: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    startedAt: Date;
    completedAt?: Date;
    totalLeadsGenerated: number;
    failedCount: number;
    logs: string[];
    error?: string;
    metadata?: any;
    createdAt: Date;
    updatedAt: Date;
}
export declare const JobExecution: import("mongoose").Model<IJobExecution, {}, {}, {}, Document<unknown, {}, IJobExecution, {}, {}> & IJobExecution & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export interface IAutomationHistory extends Document {
    automationId: Types.ObjectId;
    triggerType: 'scheduled' | 'manual' | 'api';
    totalLeadsGenerated: number;
    status: 'success' | 'partial' | 'failed';
    executionTime: number;
    error?: string;
    metadata?: any;
    createdAt: Date;
}
export declare const AutomationHistory: import("mongoose").Model<IAutomationHistory, {}, {}, {}, Document<unknown, {}, IAutomationHistory, {}, {}> & IAutomationHistory & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export interface IExportHistory extends Document {
    automationId: Types.ObjectId;
    exportType: 'csv' | 'excel';
    filePath: string;
    fileName: string;
    fileUrl?: string;
    generatedAt: Date;
    totalRecords: number;
    status: 'generated' | 'archived' | 'deleted';
    createdAt: Date;
}
export declare const ExportHistory: import("mongoose").Model<IExportHistory, {}, {}, {}, Document<unknown, {}, IExportHistory, {}, {}> & IExportHistory & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Automation.d.ts.map