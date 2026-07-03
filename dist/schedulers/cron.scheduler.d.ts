export declare class CronScheduler {
    private cronJobs;
    start(): Promise<void>;
    stop(): Promise<void>;
    scheduleAutomation(automationId: string): Promise<void>;
    cancelAutomation(automationId: string): Promise<void>;
    private getCronExpression;
    private checkPendingAutomations;
    private runAutomation;
    private calculateNextRun;
    manualRun(automationId: string): Promise<void>;
}
export declare const cronScheduler: CronScheduler;
//# sourceMappingURL=cron.scheduler.d.ts.map