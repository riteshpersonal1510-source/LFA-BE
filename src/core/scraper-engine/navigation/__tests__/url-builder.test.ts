import { describe, it, expect } from 'vitest';
import {
  buildSearchQuery,
  buildFallbackQueries,
  buildBaseMapsUrl,
  getTld,
  getCountryName,
  COUNTRY_TLD_MAP,
  NavigationInput,
} from '../url-builder';

function indianInput(overrides?: Partial<NavigationInput>): NavigationInput {
  return {
    keyword: 'plumbers',
    area: 'Andheri East',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    ...overrides,
  };
}

function usInput(overrides?: Partial<NavigationInput>): NavigationInput {
  return {
    keyword: 'plumbers',
    city: 'Brooklyn',
    state: 'New York',
    country: 'USA',
    ...overrides,
  };
}

describe('getTld', () => {
  it('returns co.in for India', () => {
    expect(getTld('India')).toBe('co.in');
  });

  it('returns co.in for india (lowercase)', () => {
    expect(getTld('india')).toBe('co.in');
  });

  it('returns com for USA', () => {
    expect(getTld('USA')).toBe('com');
  });

  it('returns com for United States', () => {
    expect(getTld('United States')).toBe('com');
  });

  it('returns ca for Canada', () => {
    expect(getTld('Canada')).toBe('ca');
  });

  it('returns co.uk for UK', () => {
    expect(getTld('UK')).toBe('co.uk');
  });

  it('returns co.uk for United Kingdom', () => {
    expect(getTld('United Kingdom')).toBe('co.uk');
  });

  it('returns com.au for Australia', () => {
    expect(getTld('Australia')).toBe('com.au');
  });

  it('returns com.sg for Singapore', () => {
    expect(getTld('Singapore')).toBe('com.sg');
  });

  it('returns co.jp for Japan', () => {
    expect(getTld('Japan')).toBe('co.jp');
  });

  it('returns de for Germany', () => {
    expect(getTld('Germany')).toBe('de');
  });

  it('returns fr for France', () => {
    expect(getTld('France')).toBe('fr');
  });

  it('returns ae for UAE', () => {
    expect(getTld('UAE')).toBe('ae');
  });

  it('returns ae for Dubai', () => {
    expect(getTld('Dubai')).toBe('ae');
  });

  it('returns com for unknown country', () => {
    expect(getTld('Mars')).toBe('com');
  });
});

describe('getCountryName', () => {
  it('returns India for india', () => {
    expect(getCountryName('india')).toBe('India');
  });

  it('returns USA for usa', () => {
    expect(getCountryName('usa')).toBe('USA');
  });

  it('returns USA for united states', () => {
    expect(getCountryName('united states')).toBe('USA');
  });

  it('returns UK for uk', () => {
    expect(getCountryName('uk')).toBe('UK');
  });

  it('returns as-is for unrecognized', () => {
    expect(getCountryName('Mars')).toBe('Mars');
  });
});

describe('buildSearchQuery', () => {
  describe('India', () => {
    const input = indianInput();

    it('level 1 includes area, city, state, country', () => {
      const result = buildSearchQuery(input, 1);
      expect(result.query).toBe('plumbers in Andheri East Mumbai Maharashtra India');
      expect(result.url).toContain('google.co.in');
      expect(result.url).toContain(encodeURIComponent('plumbers in Andheri East Mumbai Maharashtra India'));
    });

    it('level 2 skips area', () => {
      const result = buildSearchQuery(input, 2);
      expect(result.query).toBe('plumbers in Mumbai Maharashtra India');
      expect(result.query).not.toContain('Andheri');
    });

    it('level 3 uses city + country only', () => {
      const result = buildSearchQuery(input, 3);
      expect(result.query).toBe('plumbers in Mumbai India');
      expect(result.query).not.toContain('Maharashtra');
      expect(result.query).not.toContain('Andheri');
    });

    it('level 4 uses country only', () => {
      const result = buildSearchQuery(input, 4);
      expect(result.query).toBe('plumbers in India');
    });
  });

  describe('USA', () => {
    const input = usInput();

    it('level 1 includes city and state', () => {
      const result = buildSearchQuery(input, 1);
      expect(result.query).toBe('plumbers in Brooklyn New York USA');
      expect(result.url).toContain('google.com');
    });

    it('level 2 same as 1 when no area', () => {
      const noArea = usInput({ area: undefined });
      const result = buildSearchQuery(noArea, 2);
      expect(result.query).toBe('plumbers in Brooklyn New York USA');
    });

    it('level 3 uses city + country', () => {
      const result = buildSearchQuery(input, 3);
      expect(result.query).toBe('plumbers in Brooklyn USA');
    });
  });

  describe('UAE/Dubai', () => {
    it('builds query with ae tld', () => {
      const input: NavigationInput = {
        keyword: 'electricians',
        city: 'Dubai',
        country: 'UAE',
      };
      const result = buildSearchQuery(input, 3);
      expect(result.tld).toBe('ae');
      expect(result.url).toContain('google.ae');
      expect(result.query).toBe('electricians in Dubai UAE');
    });
  });

  describe('UK', () => {
    it('builds query with co.uk tld', () => {
      const input: NavigationInput = {
        keyword: 'plumbers',
        city: 'London',
        state: 'Greater London',
        country: 'UK',
      };
      const result = buildSearchQuery(input, 2);
      expect(result.tld).toBe('co.uk');
      expect(result.url).toContain('google.co.uk');
      expect(result.query).toBe('plumbers in London Greater London UK');
    });
  });

  describe('Area optionality', () => {
    it('handles missing area gracefully in level 1', () => {
      const input = indianInput({ area: undefined });
      const result = buildSearchQuery(input, 1);
      expect(result.query).toBe('plumbers in Mumbai Maharashtra India');
      expect(result.query).not.toContain('Andheri');
    });

    it('level 1 fallback works when area is missing', () => {
      const noArea = indianInput({ area: undefined });
      const queries = buildFallbackQueries(noArea);
      const level1 = queries.find(q => q.query.includes('Andheri'));
      expect(level1).toBeUndefined();
    });
  });

  describe('State optionality', () => {
    it('handles missing state gracefully', () => {
      const input = indianInput({ state: undefined });
      const result = buildSearchQuery(input, 2);
      expect(result.query).not.toContain('Maharashtra');
      expect(result.query).toContain('Mumbai India');
    });
  });
});

describe('buildFallbackQueries', () => {
  it('generates all applicable levels', () => {
    const input = indianInput();
    const queries = buildFallbackQueries(input);
    expect(queries.length).toBeGreaterThanOrEqual(3);
    expect(queries[0].query).toContain('Andheri');
    expect(queries.some(q => q.query.includes('Maharashtra'))).toBe(true);
    expect(queries.some(q => !q.query.includes('Maharashtra') && q.query.includes('Mumbai India'))).toBe(true);
  });

  it('handles missing area and state', () => {
    const input = indianInput({ area: undefined, state: undefined });
    const queries = buildFallbackQueries(input);
    expect(queries.length).toBeGreaterThanOrEqual(1);
    expect(queries[0].query).toContain('Mumbai India');
    expect(queries[0].query).not.toContain('Andheri');
    expect(queries[0].query).not.toContain('Maharashtra');
  });

  it('handles city + country only', () => {
    const input: NavigationInput = {
      keyword: 'restaurants',
      city: 'Singapore',
      country: 'Singapore',
    };
    const queries = buildFallbackQueries(input);
    expect(queries.length).toBeGreaterThanOrEqual(1);
    expect(queries[0].query).toBe('restaurants in Singapore Singapore');
    expect(queries[0].tld).toBe('com.sg');
  });
});

describe('buildBaseMapsUrl', () => {
  it('returns India-specific base url', () => {
    expect(buildBaseMapsUrl('India')).toBe('https://www.google.co.in/maps');
  });

  it('returns US-specific base url', () => {
    expect(buildBaseMapsUrl('USA')).toBe('https://www.google.com/maps');
  });

  it('returns UK base url', () => {
    expect(buildBaseMapsUrl('UK')).toBe('https://www.google.co.uk/maps');
  });

  it('returns UAE base url', () => {
    expect(buildBaseMapsUrl('UAE')).toBe('https://www.google.ae/maps');
  });

  it('returns Japan base url', () => {
    expect(buildBaseMapsUrl('Japan')).toBe('https://www.google.co.jp/maps');
  });

  it('returns France base url', () => {
    expect(buildBaseMapsUrl('France')).toBe('https://www.google.fr/maps');
  });

  it('returns Germany base url', () => {
    expect(buildBaseMapsUrl('Germany')).toBe('https://www.google.de/maps');
  });
});

describe('COUNTRY_TLD_MAP coverage', () => {
  it('has all 10 required countries', () => {
    const required = ['India', 'USA', 'Canada', 'UK', 'Australia', 'Singapore', 'Japan', 'Germany', 'France', 'UAE'];
    for (const country of required) {
      expect(getTld(country)).toBeDefined();
      expect(getCountryName(country)).toBeDefined();
    }
  });
});
