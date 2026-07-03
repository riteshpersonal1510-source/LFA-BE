export interface LocationParts {
  country?: string;
  state?: string;
  city?: string;
  area?: string;
  /** Fallback free-text location when structured parts are incomplete */
  location?: string;
}

export interface BuiltLocationQuery {
  /** Comma-separated location string for storage and display */
  locationString: string;
  /** Google Maps search query: "<keyword> in <location>" */
  searchQuery: string;
  /** Location segments used in the query (ordered) */
  segments: string[];
}

function cleanPart(value?: string | null): string {
  return (value || '').trim();
}

/**
 * Build ordered location segments respecting international address hierarchy.
 * State/province is omitted automatically when not provided.
 */
export function buildLocationSegments(parts: LocationParts): string[] {
  const segments: string[] = [];
  const area = cleanPart(parts.area);
  const city = cleanPart(parts.city);
  const state = cleanPart(parts.state);
  const country = cleanPart(parts.country);
  const fallback = cleanPart(parts.location);

  if (area) segments.push(area);
  if (city) segments.push(city);
  if (state) segments.push(state);
  if (country) segments.push(country);

  if (segments.length === 0 && fallback) {
    return fallback.split(',').map(s => s.trim()).filter(Boolean);
  }

  return segments;
}

export function buildLocationString(parts: LocationParts): string {
  return buildLocationSegments(parts).join(', ');
}

/**
 * Generate a Google Maps query using international comma-separated formatting.
 *
 * With area:    "<keyword> in <area>, <city>, <state>, <country>"
 * Without area: "<keyword> in <city>, <state>, <country>"
 */
export function buildMapsSearchQuery(keyword: string, parts: LocationParts): BuiltLocationQuery {
  const businessType = cleanPart(keyword);
  const segments = buildLocationSegments(parts);
  const locationString = segments.join(', ');

  if (!businessType) {
    return { locationString, searchQuery: locationString, segments };
  }

  const searchQuery = locationString
    ? `${businessType} in ${locationString}`
    : businessType;

  return { locationString, searchQuery, segments };
}

export function countryRequiresState(_country?: string): boolean {
  // State is optional everywhere; UI may hide the field when unavailable.
  return false;
}
