export const INDIA_SOURCES = ['google-maps', 'justdial', 'indiamart', 'clutch'] as const;
export const INTERNATIONAL_SOURCES = ['google-maps', 'clutch', 'official-website'] as const;
export const ALL_SOURCES = [...new Set([...INDIA_SOURCES, ...INTERNATIONAL_SOURCES])];

export const INDIA_COUNTRY_NAMES = ['india', 'in', 'bharat'];

export function isIndiaCountry(country?: string): boolean {
  if (!country) return true;
  const lower = country.toLowerCase().trim();
  return INDIA_COUNTRY_NAMES.includes(lower);
}

export function getSourcesForCountry(country?: string): string[] {
  if (isIndiaCountry(country)) {
    return [...INDIA_SOURCES];
  }
  return [...INTERNATIONAL_SOURCES];
}

export function validateSources(sources: string[], country?: string): string[] {
  if (!sources || sources.length === 0) {
    return getSourcesForCountry(country);
  }

  const validSources = getSourcesForCountry(country);

  const filtered = sources.filter(s => validSources.includes(s));
  if (filtered.length === 0) {
    return getSourcesForCountry(country);
  }
  return filtered;
}
