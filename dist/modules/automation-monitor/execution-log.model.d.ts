import { Model, Document } from 'mongoose';
import type { LogStatus, MonitorLogEntry } from './monitor.types';
export interface IExecutionLogDocument extends Document {
    sessionId: string;
    jobId: string;
    state: string;
    city: string;
    area: string;
    businessType: string;
    sources: string[];
    status: LogStatus;
    totalLeads: number;
    sourceResults: Array<{
        source: string;
        totalStored: number;
        totalExtracted: number;
        success: boolean;
    }>;
    startedAt: Date | null;
    completedAt: Date | null;
    duration: number | null;
    error: string | null;
    workerId: string;
    logs: MonitorLogEntry[];
}
export declare const ExecutionLogModel: Model<IExecutionLogDocument>;
//# sourceMappingURL=execution-log.model.d.ts.map