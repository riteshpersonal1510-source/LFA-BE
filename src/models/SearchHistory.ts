import { Schema, model, Document } from 'mongoose';

export interface SearchLogEntry {
  timestamp: Date;
  message: string;
  level: 'info' | 'warn' | 'error';
}

export interface SearchErrorMetadata {
  errorName?: string;
  errorMessage?: string;
  errorStack?: string;
  browserError?: string;
  googleMapsError?: string;
  playwrightError?: string;
  networkError?: string;
  userAgent?: string;
  ipAddress?: string;
  browserType?: string;
  deviceType?: string;
}

export interface ISearchHistory extends Document {
  searchSessionId: string;
  keyword: string;
  category?: string;
  state?: string;
  city?: string;
  area?: string;
  country?: string;
  sources: string[];
  totalLeads: number;
  businessesFound: number;
  businessesSaved: number;
  duplicates: number;
  rejected: number;
  startedAt: Date;
  completedAt?: Date;
  stoppedAt?: Date;
  duration: number;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'STOPPED' | 'CANCELLED' | 'TIMEOUT' | 'PARTIAL_SUCCESS' | 'NO_RESULTS';
  searchState: string;
  currentFound: number;
  currentSaved: number;
  currentDuplicates: number;
  failedCount: number;
  rejectedCount: number;
  estimatedTotal: number;
  maxProgressReached: number;
  progress: number;
  currentSource: string;
  currentStage: string;
  currentBusiness: string;
  currentUrl: string;
  lastProcessedBusiness?: string;
  eta: number;
  totalProcessed: number;
  totalFound: number;
  uniqueSaved: number;
  duplicatesRemoved: number;
  error?: string;
  failureReason?: string;
  failureClassification?: 'PLAYWRIGHT_CRASH' | 'GOOGLE_BLOCKED' | 'BROWSER_CLOSED' | 'NETWORK_TIMEOUT' | 'USER_STOPPED' | 'BACKEND_CRASH' | 'SOCKET_DISCONNECT' | 'NO_RESULTS_FOUND' | 'AUTH_EXPIRED' | 'UNKNOWN';
  errorMetadata?: SearchErrorMetadata;
  sourceBreakdown: Record<string, number>;
  logs: SearchLogEntry[];
  lastHeartbeat?: Date;
  lastUpdateTime?: Date;
  isRunning: boolean;
  createdBy?: string;
  userId?: string;
  sessionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const searchHistorySchema = new Schema<ISearchHistory>(
  {
    searchSessionId: { type: String, required: true, unique: true },
    keyword: { type: String, required: true },
    category: String,
    state: String,
    city: String,
    area: String,
    country: String,
    sources: [{ type: String }],
    totalLeads: { type: Number, default: 0 },
    businessesFound: { type: Number, default: 0 },
    businessesSaved: { type: Number, default: 0 },
    duplicates: { type: Number, default: 0 },
    rejected: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    completedAt: Date,
    stoppedAt: Date,
    duration: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'STOPPED', 'CANCELLED', 'TIMEOUT', 'PARTIAL_SUCCESS', 'NO_RESULTS'],
      default: 'QUEUED',
    },
    searchState: { type: String, default: 'IDLE' },
    currentFound: { type: Number, default: 0 },
    currentSaved: { type: Number, default: 0 },
    currentDuplicates: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    rejectedCount: { type: Number, default: 0 },
    estimatedTotal: { type: Number, default: 0 },
    maxProgressReached: { type: Number, default: 0 },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    currentSource: { type: String, default: '' },
    currentStage: { type: String, default: '' },
    currentBusiness: { type: String, default: '' },
    currentUrl: { type: String, default: '' },
    lastProcessedBusiness: String,
    eta: { type: Number, default: 0 },
    totalProcessed: { type: Number, default: 0 },
    totalFound: { type: Number, default: 0 },
    uniqueSaved: { type: Number, default: 0 },
    duplicatesRemoved: { type: Number, default: 0 },
    error: String,
    failureReason: String,
    failureClassification: {
      type: String,
      enum: ['PLAYWRIGHT_CRASH', 'GOOGLE_BLOCKED', 'BROWSER_CLOSED', 'NETWORK_TIMEOUT', 'USER_STOPPED', 'BACKEND_CRASH', 'SOCKET_DISCONNECT', 'NO_RESULTS_FOUND', 'AUTH_EXPIRED', 'UNKNOWN'],
    },
    errorMetadata: {
      errorName: String,
      errorMessage: String,
      errorStack: String,
      browserError: String,
      googleMapsError: String,
      playwrightError: String,
      networkError: String,
      userAgent: String,
      ipAddress: String,
      browserType: String,
      deviceType: String,
    },
    sourceBreakdown: { type: Schema.Types.Mixed, default: {} },
    logs: [{
      timestamp: { type: Date, default: Date.now },
      message: String,
      level: { type: String, enum: ['info', 'warn', 'error'], default: 'info' },
    }],
    lastHeartbeat: Date,
    lastUpdateTime: Date,
    isRunning: { type: Boolean, default: true, index: true },
    createdBy: String,
    userId: String,
    sessionId: String,
  },
  {
    timestamps: true,
  }
);

searchHistorySchema.index({ createdAt: -1 });
searchHistorySchema.index({ state: 1, city: 1, area: 1, country: 1 });
searchHistorySchema.index({ status: 1 });
searchHistorySchema.index({ isRunning: 1 });
searchHistorySchema.index({ failureClassification: 1 });

export const SearchHistory = model<ISearchHistory>('SearchHistory', searchHistorySchema);
