import mongoose, { Document } from 'mongoose';
export interface IEmailScanCache extends Document {
    normalizedDomain: string;
    emails: string[];
    primaryEmail: string;
    emailCount: number;
    lastScanAt: Date;
    expiresAt: Date;
}
export declare const EmailScanCache: mongoose.Model<IEmailScanCache, {}, {}, {}, mongoose.Document<unknown, {}, IEmailScanCache, {}, {}> & IEmailScanCache & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=EmailScanCache.d.ts.map