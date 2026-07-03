import { Document, Types } from 'mongoose';
export interface IFollowUp extends Document {
    leadId: Types.ObjectId;
    dueDate: Date;
    note?: string;
    completed: boolean;
    completedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const FollowUp: import("mongoose").Model<IFollowUp, {}, {}, {}, Document<unknown, {}, IFollowUp, {}, {}> & IFollowUp & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=CrmFollowUp.d.ts.map