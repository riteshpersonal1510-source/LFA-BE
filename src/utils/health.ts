import process from 'process';

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

export function buildBackendHealthPayload(params: {
  databaseStatus: string;
  socketStatus: string;
  playwrightStatus: string;
  uptime: number;
  port: number;
  environment: string;
  pythonScraperUrl: string;
  version: string;
}): BackendHealthPayload {
  const mem = process.memoryUsage();
  return {
    status: 'ok',
    backend: 'running',
    uptime: params.uptime,
    database: params.databaseStatus,
    playwright: params.playwrightStatus,
    socket: params.socketStatus,
    pythonScraper: params.pythonScraperUrl,
    scrapingEngine: 'python',
    environment: params.environment,
    port: params.port,
    version: params.version,
    memory: {
      rssMb: Math.round(mem.rss / 1024 / 1024),
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      externalMb: Math.round(mem.external / 1024 / 1024),
    },
    timestamp: new Date().toISOString(),
  };
}
