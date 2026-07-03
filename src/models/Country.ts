import { Schema, model, type Document } from 'mongoose';

export interface ICountry extends Document<number> {
  name: string;
  iso2: string;
  iso3: string;
  phoneCode: string;
  continent: string;
  currency: string;
  supported: boolean;
  hasStates: boolean;
  slug: string;
}

const countrySchema = new Schema<ICountry>({
  _id: { type: Number, required: true },
  name: { type: String, required: true, index: true },
  iso2: { type: String, required: true, unique: true, uppercase: true },
  iso3: { type: String, required: true, unique: true, uppercase: true },
  phoneCode: { type: String, required: true },
  continent: { type: String, required: true },
  currency: { type: String, default: '' },
  supported: { type: Boolean, default: false },
  hasStates: { type: Boolean, default: false },
  slug: { type: String, required: true, unique: true, lowercase: true },
}, { timestamps: true });

countrySchema.index({ supported: 1, name: 1 });

const CountryModel = model<ICountry>('Country', countrySchema);
export { CountryModel as Country };
