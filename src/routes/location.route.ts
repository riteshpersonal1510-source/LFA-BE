import { Router } from 'express';
import {
  getCountries,
  getStates,
  getCities,
  getAreas,
  validateLocation,
} from '../controllers/location.controller';
import { asyncHandler } from '../utils/error-handler';

const router = Router();

router.get('/countries', asyncHandler(getCountries));
router.get('/countries/:countryId/states', asyncHandler(getStates));
router.get('/states/:stateId/cities', asyncHandler(getCities));
router.get('/cities/:cityId/areas', asyncHandler(getAreas));
router.post('/validate-location', asyncHandler(validateLocation));

export default router;
