export type AreaJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type AreaSessionStatus = 'draft' | 'running' | 'paused' | 'completed' | 'failed' | 'archived';

export interface AreaAutomationSourceResult {
  source: string;
  totalStored: number;
  totalExtracted: number;
  totalDuplicates: number;
  success: boolean;
}

export interface IAreaAutomationJob {
  id: string;
  sessionId: string;
  businessType: string;
  city: string;
  state?: string;
  area?: string;
  country?: string;
  sources: string[];
  status: AreaJobStatus;
  progress: string;
  currentStage: string;
  totalLeads: number;
  savedLeads: number;
  duplicates: number;
  rejected: number;
  attempts: number;
  sourceResults: AreaAutomationSourceResult[];
  startedAt: string | null;
  completedAt: string | null;
  failedReason: string | null;
  queuePosition: number;
  totalJobs: number;
  createdAt: string;
  updatedAt: string;
}

export interface IAreaAutomationSession {
  id: string;
  name: string;
  businessTypes: string[];
  cities: string[];
  state?: string;
  country?: string;
  sources: string[];
  status: AreaSessionStatus;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  runningJobs: number;
  skippedJobs: number;
  totalLeads: number;
  savedLeads: number;
  duplicates: number;
  rejected: number;
  currentJobId: string | null;
  currentStage: string;
  lastHeartbeat: string | null;
  startedAt: string | null;
  completedAt: string | null;
  pausedAt: string | null;
  archivedAt: string | null;
  retryCount: number;
  lastRunAt: string | null;
  maxLeads: number;
  concurrency: number;
  retryEnabled: boolean;
  dedupEnabled: boolean;
  aiAuditEnabled: boolean;
  autoOutreach: boolean;
  autoReport: boolean;
  autoWhatsApp: boolean;
  schedule: string;
  frequency: string;
  createdAt: string;
  updatedAt: string;
}

export interface StartAutomationRequest {
  businessTypes: string[];
  cities: string[];
  state?: string;
  country?: string;
  sources: string[];
  name?: string;
  maxLeads?: number;
  concurrency?: number;
  retryEnabled?: boolean;
  dedupEnabled?: boolean;
  aiAuditEnabled?: boolean;
  autoOutreach?: boolean;
  autoReport?: boolean;
  autoWhatsApp?: boolean;
  schedule?: string;
  frequency?: string;
  saveAsDraft?: boolean;
}

export interface SessionSummary {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  runningJobs: number;
  pendingJobs: number;
  skippedJobs: number;
  totalLeads: number;
  savedLeads: number;
  duplicates: number;
  rejected: number;
  businessTypesCount: number;
  progressPercent: number;
  elapsedMs: number;
  etaMs: number | null;
  currentCity: string | null;
  currentArea: string | null;
  currentStage: string | null;
}

export interface AreaAutomationProgress {
  session: IAreaAutomationSession;
  jobs: IAreaAutomationJob[];
  summary: SessionSummary;
}

export interface SessionFilterOptions {
  status?: string;
  search?: string;
  source?: string;
  state?: string;
  city?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}
