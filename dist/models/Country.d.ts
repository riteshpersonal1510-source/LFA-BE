import { type Document } from 'mongoose';
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
declare const CountryModel: import("mongoose").Model<ICountry, {}, {}, {}, Document<unknown, {}, ICountry, {}, {}> & ICountry & Required<{
    _id: number;
}> & {
    __v: number;
}, any>;
export { CountryModel as Country };
//# sourceMappingURL=Country.d.ts.map