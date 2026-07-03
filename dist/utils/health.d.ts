export interface BackendHealthPayload {
    status: 'ok';
    backend: 'running';
    uptime: number;
    database: string;
    playwright: string;
    socket: string;
    pythonScraper: string;
    scrapingEngine: 'python';
    environment: string;
    port: number;
    version: string;
    memory: {
        rssMb: number;
        heapUsedMb: number;
        externalMb: number;
    };
    timestamp: string;
}
export declare function buildBackendHealthPayload(params: {
    databaseStatus: string;
    socketStatus: string;
    playwrightStatus: string;
    uptime: number;
    port: number;
    environment: string;
    pythonScraperUrl: string;
    version: string;
}): BackendHealthPayload;
//# sourceMappingURL=health.d.ts.map