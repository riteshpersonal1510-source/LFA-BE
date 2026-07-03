import { type Document, type Types } from 'mongoose';
export interface ICity extends Document {
    _id: Types.ObjectId;
    stateId: Types.ObjectId;
    countryId: number;
    name: string;
    slug: string;
    latitude?: number;
    longitude?: number;
}
export declare const City: import("mongoose").Model<ICity, {}, {}, {}, Document<unknown, {}, ICity, {}, {}> & ICity & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=City.d.ts.map