import { Document, Types } from 'mongoose';
export type ActivityType = 'lead-created' | 'stage-changed' | 'note-added' | 'note-updated' | 'note-deleted' | 'follow-up-created' | 'follow-up-updated' | 'follow-up-deleted' | 'follow-up-completed' | 'lead-assigned' | 'lead-converted';
export interface IActivity extends Document {
    leadId: Types.ObjectId;
    type: ActivityType;
    timestamp: Date;
    previousValue?: string;
    updatedValue?: string;
    description: string;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Activity: import("mongoose").Model<IActivity, {}, {}, {}, Document<unknown, {}, IActivity, {}, {}> & IActivity & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=CrmActivity.d.ts.map