import { Document, Types } from 'mongoose';
export interface INote extends Document {
    leadId: Types.ObjectId;
    content: string;
    author: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Note: import("mongoose").Model<INote, {}, {}, {}, Document<unknown, {}, INote, {}, {}> & INote & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=CrmNote.d.ts.map