import { Document } from 'mongoose';
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
export declare const SearchHistory: import("mongoose").Model<ISearchHistory, {}, {}, {}, Document<unknown, {}, ISearchHistory, {}, {}> & ISearchHistory & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=SearchHistory.d.ts.map