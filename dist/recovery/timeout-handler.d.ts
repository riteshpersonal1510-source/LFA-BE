export declare class TimeoutHandler {
    private defaultTimeout;
    constructor(defaultTimeout?: number);
    withTimeout<T>(fn: () => Promise<T>, timeout: number, timeoutMessage?: string): Promise<T>;
    withDefaultTimeout<T>(fn: () => Promise<T>): Promise<T>;
    navigateWithTimeout(page: any, url: string, timeout?: number): Promise<void>;
    extractWithTimeout<T>(extraction: () => Promise<T>, timeout?: number, operation?: string): Promise<T>;
}
//# sourceMappingURL=timeout-handler.d.ts.map