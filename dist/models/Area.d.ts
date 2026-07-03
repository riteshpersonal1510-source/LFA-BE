import { type Document, type Types } from 'mongoose';
export interface IArea extends Document {
    _id: Types.ObjectId;
    cityId: Types.ObjectId;
    stateId: Types.ObjectId;
    countryId: number;
    name: string;
    slug: string;
}
export declare const Area: import("mongoose").Model<IArea, {}, {}, {}, Document<unknown, {}, IArea, {}, {}> & IArea & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Area.d.ts.map