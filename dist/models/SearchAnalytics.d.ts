import { Document } from 'mongoose';
export interface ISearchAnalytics extends Document {
    sessionId: string;
    keyword: string;
    expandedKeywords: string[];
    state?: string;
    city?: string;
    area?: string;
    location: string;
    sources: string[];
    totalLeadsFound: number;
    totalUniqueLeads: number;
    totalDuplicatesRemoved: number;
    sourceBreakdown: Record<string, number>;
    keywordBreakdown: Record<string, number>;
    status: 'running' | 'completed' | 'failed';
    duration: number;
    startedAt: Date;
    completedAt?: Date;
    error?: string;
}
export declare const SearchAnalytics: import("mongoose").Model<ISearchAnalytics, {}, {}, {}, Document<unknown, {}, ISearchAnalytics, {}, {}> & ISearchAnalytics & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=SearchAnalytics.d.ts.map