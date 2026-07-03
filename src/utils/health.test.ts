import { describe, expect, it } from 'vitest';
import { buildBackendHealthPayload } from './health';

describe('buildBackendHealthPayload', () => {
  it('includes deployment-critical health fields', () => {
    const payload = buildBackendHealthPayload({
      databaseStatus: 'connected',
      socketStatus: 'initialized',
      playwrightStatus: 'available',
      uptime: 42.5,
      port: 5001,
      environment: 'production',
      pythonScraperUrl: 'http://ai-service:8001',
      version: '1.0.0',
    });

    expect(payload.status).toBe('ok');
    expect(payload.database).toBe('connected');
    expect(payload.socket).toBe('initialized');
    expect(payload.version).toBe('1.0.0');
    expect(payload.memory).toMatchObject({
      rssMb: expect.any(Number),
      heapUsedMb: expect.any(Number),
    });
    expect(payload.port).toBe(5001);
  });
});
