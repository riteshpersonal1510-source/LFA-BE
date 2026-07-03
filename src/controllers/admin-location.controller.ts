import type { Request, Response, NextFunction } from 'express';
import { Country, State, City, Area } from '../models';
import { APIResponse } from '../utils/api-response';

function toSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export const listCountries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const search = (req.query.search as string) || '';
    const filter: Record<string, unknown> = {};
    if (search) filter.name = { $regex: search, $options: 'i' };
    const total = await Country.countDocuments(filter);
    const countries = await Country.find(filter)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    APIResponse.paginated(res, countries, { page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

export const createCountry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as Record<string, unknown>;
    const name = body.name as string | undefined;
    const iso2 = body.iso2 as string | undefined;
    const iso3 = body.iso3 as string | undefined;
    if (!name || !iso2 || !iso3) {
      APIResponse.error(res, 'name, iso2, iso3 are required', undefined, 400);
      return;
    }
    const country = await Country.create({
      _id: (body.id as number) || Date.now(),
      name,
      iso2,
      iso3,
      phoneCode: (body.phoneCode as string) || '',
      continent: (body.continent as string) || '',
      currency: (body.currency as string) || '',
      supported: body.supported !== undefined ? Boolean(body.supported) : true,
      hasStates: body.hasStates !== undefined ? Boolean(body.hasStates) : true,
      slug: toSlug(name),
    });
    APIResponse.success(res, country.toObject(), 'Country created', 201);
  } catch (err) { next(err); }
};

export const updateCountry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const body = req.body as Record<string, unknown>;
    const update: Record<string, unknown> = {};
    const fields = ['name', 'iso2', 'iso3', 'phoneCode', 'continent', 'currency', 'supported', 'hasStates'];
    for (const f of fields) {
      if (body[f] !== undefined) update[f] = body[f];
    }
    if (update.name) update.slug = toSlug(update.name as string);
    const country = await Country.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).lean();
    if (!country) {
      APIResponse.error(res, 'Country not found', undefined, 404);
      return;
    }
    APIResponse.success(res, country, 'Country updated');
  } catch (err) { next(err); }
};

export const deleteCountry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const country = await Country.findByIdAndUpdate(id, { $set: { supported: false } }, { new: true }).lean();
    if (!country) {
      APIResponse.error(res, 'Country not found', undefined, 404);
      return;
    }
    APIResponse.success(res, country, 'Country disabled');
  } catch (err) { next(err); }
};

export const listStates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const countryId = parseInt(req.params.countryId, 10);
    if (isNaN(countryId)) {
      APIResponse.error(res, 'Invalid country ID', undefined, 400);
      return;
    }
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const search = (req.query.search as string) || '';
    const filter: Record<string, unknown> = { countryId };
    if (search) filter.name = { $regex: search, $options: 'i' };
    const total = await State.countDocuments(filter);
    const states = await State.find(filter)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    APIResponse.paginated(res, states, { page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

export const createState = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const countryId = parseInt(req.params.countryId, 10);
    if (isNaN(countryId)) {
      APIResponse.error(res, 'Invalid country ID', undefined, 400);
      return;
    }
    const body = req.body as Record<string, unknown>;
    const name = body.name as string | undefined;
    if (!name) {
      APIResponse.error(res, 'name is required', undefined, 400);
      return;
    }
    const state = await State.create({ countryId, name, stateCode: (body.stateCode as string) || '', slug: toSlug(name), latitude: body.latitude as number | undefined, longitude: body.longitude as number | undefined });
    APIResponse.success(res, state.toObject(), 'State created', 201);
  } catch (err) { next(err); }
};

export const updateState = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const body = req.body as Record<string, unknown>;
    const update: Record<string, unknown> = {};
    const fields = ['name', 'stateCode', 'latitude', 'longitude'];
    for (const f of fields) {
      if (body[f] !== undefined) update[f] = body[f];
    }
    if (update.name) update.slug = toSlug(update.name as string);
    const state = await State.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).lean();
    if (!state) {
      APIResponse.error(res, 'State not found', undefined, 404);
      return;
    }
    APIResponse.success(res, state, 'State updated');
  } catch (err) { next(err); }
};

export const deleteState = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const state = await State.findByIdAndDelete(id).lean();
    if (!state) {
      APIResponse.error(res, 'State not found', undefined, 404);
      return;
    }
    APIResponse.success(res, null, 'State deleted');
  } catch (err) { next(err); }
};

export const listCities = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { stateId } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const search = (req.query.search as string) || '';
    const filter: Record<string, unknown> = { stateId };
    if (search) filter.name = { $regex: search, $options: 'i' };
    const total = await City.countDocuments(filter);
    const cities = await City.find(filter)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    APIResponse.paginated(res, cities, { page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

export const createCity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { stateId } = req.params;
    const state = await State.findById(stateId).lean();
    if (!state) {
      APIResponse.error(res, 'State not found', undefined, 404);
      return;
    }
    const body = req.body as Record<string, unknown>;
    const name = body.name as string | undefined;
    if (!name) {
      APIResponse.error(res, 'name is required', undefined, 400);
      return;
    }
    const city = await City.create({
      stateId,
      countryId: state.countryId,
      name,
      slug: toSlug(name),
      latitude: body.latitude as number | undefined,
      longitude: body.longitude as number | undefined,
    });
    APIResponse.success(res, city.toObject(), 'City created', 201);
  } catch (err) { next(err); }
};

export const updateCity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const body = req.body as Record<string, unknown>;
    const update: Record<string, unknown> = {};
    const fields = ['name', 'latitude', 'longitude'];
    for (const f of fields) {
      if (body[f] !== undefined) update[f] = body[f];
    }
    if (update.name) update.slug = toSlug(update.name as string);
    const city = await City.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).lean();
    if (!city) {
      APIResponse.error(res, 'City not found', undefined, 404);
      return;
    }
    APIResponse.success(res, city, 'City updated');
  } catch (err) { next(err); }
};

export const deleteCity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const city = await City.findByIdAndDelete(id).lean();
    if (!city) {
      APIResponse.error(res, 'City not found', undefined, 404);
      return;
    }
    APIResponse.success(res, null, 'City deleted');
  } catch (err) { next(err); }
};

export const listAreas = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cityId } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const search = (req.query.search as string) || '';
    const filter: Record<string, unknown> = { cityId };
    if (search) filter.name = { $regex: search, $options: 'i' };
    const total = await Area.countDocuments(filter);
    const areas = await Area.find(filter)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    APIResponse.paginated(res, areas, { page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

export const createArea = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cityId } = req.params;
    const city = await City.findById(cityId).lean();
    if (!city) {
      APIResponse.error(res, 'City not found', undefined, 404);
      return;
    }
    const body = req.body as Record<string, unknown>;
    const name = body.name as string | undefined;
    if (!name) {
      APIResponse.error(res, 'name is required', undefined, 400);
      return;
    }
    const area = await Area.create({
      cityId,
      stateId: city.stateId,
      countryId: city.countryId,
      name,
      slug: toSlug(name),
    });
    APIResponse.success(res, area.toObject(), 'Area created', 201);
  } catch (err) { next(err); }
};

export const deleteArea = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const area = await Area.findByIdAndDelete(id).lean();
    if (!area) {
      APIResponse.error(res, 'Area not found', undefined, 404);
      return;
    }
    APIResponse.success(res, null, 'Area deleted');
  } catch (err) { next(err); }
};
