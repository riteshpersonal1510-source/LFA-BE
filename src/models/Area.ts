import { Schema, model, type Document, type Types } from 'mongoose';

export interface IArea extends Document {
  _id: Types.ObjectId;
  cityId: Types.ObjectId;
  stateId: Types.ObjectId;
  countryId: number;
  name: string;
  slug: string;
}

const areaSchema = new Schema<IArea>({
  cityId: { type: Schema.Types.ObjectId, required: true, index: true, ref: 'City' },
  stateId: { type: Schema.Types.ObjectId, required: true, index: true },
  countryId: { type: Number, required: true, index: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, lowercase: true },
}, { timestamps: true });

areaSchema.index({ cityId: 1, name: 1 }, { unique: true });
areaSchema.index({ stateId: 1, name: 1 });

export const Area = model<IArea>('Area', areaSchema);
