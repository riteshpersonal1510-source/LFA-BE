import { BrowserPool } from '../browser/browser-pool';
export interface CrashRecoveryOptions {
    maxRestartAttempts: number;
    restartCooldown: number;
}
export declare class CrashRecovery {
    private browserPool;
    private restartCount;
    private options;
    constructor(browserPool: BrowserPool, options?: Partial<CrashRecoveryOptions>);
    handleCrash(sessionId: string): Promise<boolean>;
    reset(sessionId: string): void;
    getRestartCount(sessionId: string): number;
    private sleep;
}
//# sourceMappingURL=crash-recovery.d.ts.map