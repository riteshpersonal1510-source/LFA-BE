import { type Document, type Types } from 'mongoose';
export interface IState extends Document {
    _id: Types.ObjectId;
    countryId: number;
    name: string;
    stateCode: string;
    slug: string;
    latitude?: number;
    longitude?: number;
}
export declare const State: import("mongoose").Model<IState, {}, {}, {}, Document<unknown, {}, IState, {}, {}> & IState & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=State.d.ts.map