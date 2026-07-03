import { Schema, model, type Document, type Types } from 'mongoose';

export interface ICity extends Document {
  _id: Types.ObjectId;
  stateId: Types.ObjectId;
  countryId: number;
  name: string;
  slug: string;
  latitude?: number;
  longitude?: number;
}

const citySchema = new Schema<ICity>({
  stateId: { type: Schema.Types.ObjectId, required: true, index: true, ref: 'State' },
  countryId: { type: Number, required: true, index: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, lowercase: true },
  latitude: Number,
  longitude: Number,
}, { timestamps: true });

citySchema.index({ stateId: 1, name: 1 }, { unique: true });
citySchema.index({ countryId: 1, name: 1 });

export const City = model<ICity>('City', citySchema);
