import { Schema, model, type Document, type Types } from 'mongoose';

export interface IState extends Document {
  _id: Types.ObjectId;
  countryId: number;
  name: string;
  stateCode: string;
  slug: string;
  latitude?: number;
  longitude?: number;
}

const stateSchema = new Schema<IState>({
  countryId: { type: Number, required: true, index: true, ref: 'Country' },
  name: { type: String, required: true },
  stateCode: { type: String, default: '' },
  slug: { type: String, required: true, lowercase: true },
  latitude: Number,
  longitude: Number,
}, { timestamps: true });

stateSchema.index({ countryId: 1, name: 1 }, { unique: true });
stateSchema.index({ countryId: 1, slug: 1 });

export const State = model<IState>('State', stateSchema);
