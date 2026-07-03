import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/error-handler';
import {
  listCountries, createCountry, updateCountry, deleteCountry,
  listStates, createState, updateState, deleteState,
  listCities, createCity, updateCity, deleteCity,
  listAreas, createArea, deleteArea,
} from '../controllers/admin-location.controller';

const router = Router();

router.get('/countries', authenticate, asyncHandler(listCountries));
router.post('/countries', authenticate, asyncHandler(createCountry));
router.put('/countries/:id', authenticate, asyncHandler(updateCountry));
router.delete('/countries/:id', authenticate, asyncHandler(deleteCountry));

router.get('/countries/:countryId/states', authenticate, asyncHandler(listStates));
router.post('/countries/:countryId/states', authenticate, asyncHandler(createState));
router.put('/states/:id', authenticate, asyncHandler(updateState));
router.delete('/states/:id', authenticate, asyncHandler(deleteState));

router.get('/states/:stateId/cities', authenticate, asyncHandler(listCities));
router.post('/states/:stateId/cities', authenticate, asyncHandler(createCity));
router.put('/cities/:id', authenticate, asyncHandler(updateCity));
router.delete('/cities/:id', authenticate, asyncHandler(deleteCity));

router.get('/cities/:cityId/areas', authenticate, asyncHandler(listAreas));
router.post('/cities/:cityId/areas', authenticate, asyncHandler(createArea));
router.delete('/areas/:id', authenticate, asyncHandler(deleteArea));

export default router;
