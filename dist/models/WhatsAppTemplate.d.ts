import { Document } from 'mongoose';
export interface IWhatsAppTemplate extends Document {
    type: 'website' | 'no_website';
    name: string;
    message: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const WhatsAppTemplate: import("mongoose").Model<IWhatsAppTemplate, {}, {}, {}, Document<unknown, {}, IWhatsAppTemplate, {}, {}> & IWhatsAppTemplate & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=WhatsAppTemplate.d.ts.map