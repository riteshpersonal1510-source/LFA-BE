import { EventEmitter } from 'events';
declare class ResponsiveAuditQueueService extends EventEmitter {
    private isProcessing;
    private readonly limit;
    private readonly batchSize;
    startProcessing(): Promise<void>;
    stopProcessing(): void;
    private getLeadsToAudit;
    private sleep;
}
export declare const responsiveAuditQueueService: ResponsiveAuditQueueService;
export {};
//# sourceMappingURL=responsive-audit-queue.service.d.ts.map