export interface HealthComponent {
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
    message?: string;
    latencyMs?: number;
    details?: Record<string, unknown>;
}
export interface HealthReport {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    environment: string;
    components: HealthComponent[];
    summary: {
        total: number;
        healthy: number;
        degraded: number;
        unhealthy: number;
    };
}
export declare function getHealthReport(): Promise<HealthReport>;
export declare function getSimpleHealth(): Promise<{
    status: string;
    timestamp: string;
    database: string;
}>;
//# sourceMappingURL=health-check.d.ts.map