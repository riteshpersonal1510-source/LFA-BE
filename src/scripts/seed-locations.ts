import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connect, disconnect } from 'mongoose';
import { Country, State, City, Area } from '../models';
import { COUNTRIES } from '../config/countries-data';
import { getCitiesForState, getAreasForCity } from '../config/location-data';

const INDIAN_STATES: string[] = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Lakshadweep", "Delhi",
  "Puducherry", "Ladakh", "Jammu and Kashmir",
];

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function seedLocations(mongoUri: string): Promise<void> {
  await connect(mongoUri);
  console.log('Connected to MongoDB');

  const existingCountries = await Country.countDocuments();
  if (existingCountries === 0) {
    for (const c of COUNTRIES) {
      await Country.create({
        _id: c.id,
        name: c.name,
        iso2: c.iso2,
        iso3: c.iso3,
        phoneCode: c.phoneCode,
        continent: c.continent,
        currency: c.currency,
        supported: true,
        hasStates: c.hasStates,
        slug: slugify(c.name),
      });
    }
    console.log(`Seeded ${COUNTRIES.length} countries`);
  } else {
    console.log(`Database already has ${existingCountries} countries. Skipping countries.`);
  }

  const indiaId = 76;
  for (const stateName of INDIAN_STATES) {
    let state = await State.findOne({ countryId: indiaId, name: stateName });
    if (!state) {
      state = await State.create({
        countryId: indiaId,
        name: stateName,
        stateCode: stateName.substring(0, 3).toUpperCase(),
        slug: slugify(stateName),
      });
    }

    const cities = getCitiesForState(stateName);
    if (cities.length === 0) continue;

    for (const cityName of cities) {
      let city = await City.findOne({ stateId: state._id, name: cityName });
      if (!city) {
        city = await City.create({
          stateId: state._id,
          countryId: indiaId,
          name: cityName,
          slug: slugify(cityName),
        });
      }

      const areas = getAreasForCity(stateName, cityName);
      if (areas.length === 0) continue;

      const areaDocs = areas.map((areaName: string) => ({
        cityId: city._id,
        stateId: state._id,
        countryId: indiaId,
        name: areaName,
        slug: slugify(areaName),
      }));

      try {
        const result = await Area.insertMany(areaDocs, { ordered: false });
        console.log(`  ${stateName} > ${cityName}: ${result.length} areas`);
      } catch {
        console.log(`  ${stateName} > ${cityName}: 0 new areas (all duplicates)`);
      }
    }
  }

  console.log('India location data seeded successfully');
  await disconnect();
}

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lead-finder';
seedLocations(uri).catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
