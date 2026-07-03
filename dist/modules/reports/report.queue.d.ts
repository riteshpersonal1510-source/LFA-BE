import { EventEmitter } from 'events';
export declare class ReportQueue extends EventEmitter {
    private queue;
    private processing;
    enqueue(leadId: string): Promise<any>;
    private processNext;
    isQueued(leadId: string): boolean;
    getQueueSize(): number;
}
export declare const reportQueue: ReportQueue;
//# sourceMappingURL=report.queue.d.ts.map