import type { Request, Response, NextFunction } from 'express';
import { Country, State, City, Area } from '../models';
import { APIResponse } from '../utils/api-response';

export const getCountries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { supported } = req.query;
    const filter: Record<string, unknown> = {};
    if (supported === 'true') filter.supported = true;
    const countries = await Country.find(filter).sort({ name: 1 }).lean();
    APIResponse.success(res, countries);
  } catch (err) {
    next(err);
  }
};

export const getStates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const countryId = parseInt(req.params.countryId, 10);
    if (isNaN(countryId)) {
      APIResponse.error(res, 'Invalid country ID', undefined, 400);
      return;
    }
    const states = await State.find({ countryId }).sort({ name: 1 }).lean();
    APIResponse.success(res, states);
  } catch (err) {
    next(err);
  }
};

export const getCities = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { stateId } = req.params;
    const cities = await City.find({ stateId }).sort({ name: 1 }).lean();
    APIResponse.success(res, cities);
  } catch (err) {
    next(err);
  }
};

export const getAreas = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cityId } = req.params;
    const areas = await Area.find({ cityId }).sort({ name: 1 }).lean();
    APIResponse.success(res, areas);
  } catch (err) {
    next(err);
  }
};

export const validateLocation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { countryId, stateId, cityId, areaId } = req.body as Record<string, unknown>;
    if (!countryId) {
      APIResponse.error(res, 'countryId is required', undefined, 400);
      return;
    }
    const country = await Country.findById(countryId).lean();
    if (!country) {
      APIResponse.error(res, 'Country not found', undefined, 404);
      return;
    }
    if (stateId) {
      const state = await State.findOne({ _id: stateId, countryId }).lean();
      if (!state) {
        APIResponse.error(res, 'State not found in the given country', undefined, 404);
        return;
      }
      if (cityId) {
        const city = await City.findOne({ _id: cityId, stateId }).lean();
        if (!city) {
          APIResponse.error(res, 'City not found in the given state', undefined, 404);
          return;
        }
        if (areaId) {
          const area = await Area.findOne({ _id: areaId, cityId }).lean();
          if (!area) {
            APIResponse.error(res, 'Area not found in the given city', undefined, 404);
            return;
          }
        }
      }
    }
    APIResponse.success(res, { valid: true });
  } catch (err) {
    next(err);
  }
};
