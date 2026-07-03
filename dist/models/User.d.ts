import { Document } from 'mongoose';
export interface IUser extends Document {
    email: string;
    password: string;
    name: string;
    role: 'admin';
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const User: import("mongoose").Model<IUser, {}, {}, {}, Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=User.d.ts.map