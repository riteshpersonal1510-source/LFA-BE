export interface ScraperLead {
  companyName: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  category?: string;
  secondaryCategories?: string[];
  rating?: number;
  reviewsCount?: number;
  totalPhotos?: number;
  serviceOptions?: string[];
  ownerClaimed?: boolean;
  streetAddress?: string;
  postalCode?: string;
  source: string;
  sourceUrl?: string;
  href?: string;
  placeId?: string;
  city?: string;
  state?: string;
  area?: string;
  country?: string;
  businessType?: string;
  fullSearchQuery?: string;
  searchedKeyword?: string;
  searchedLocation?: string;
  searchedCity?: string;
  searchedState?: string;
  searchedArea?: string;
  searchedCountry?: string;
  searchedBusinessType?: string;
  searchRank?: number;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  workingHours?: string;
  businessStatus?: string;
  plusCode?: string;
  products?: string;
  gst?: string;
  locationRelevanceScore?: number;
  relevanceScore?: number;
  validatedCategory?: string;
  sources?: string[];
}

export interface ScraperResult {
  success: boolean;
  message: string;
  totalExtracted: number;
  totalStored: number;
  totalDuplicates: number;
  leads: ScraperLead[];
  sourceResults: SourceResult[];
  partialSuccess?: boolean;
  errors?: ScraperError[];
}

export interface SourceResult {
  source: string;
  totalStored: number;
  totalExtracted: number;
  totalDuplicates: number;
  success: boolean;
  error?: string;
  retriesUsed?: number;
}

export interface ScraperError {
  source: string;
  keyword: string;
  error: string;
  retryable: boolean;
}

export interface ScraperOptions {
  keyword: string;
  location?: string;
  sources: string[];
  limit: number;
  state?: string;
  city?: string;
  area?: string;
  country?: string;
  businessType?: string;
  sessionId?: string;
  semanticExpansion?: boolean;
  semanticKeyword?: string;
  userId?: string;
  skipSearchTracking?: boolean;
  automationSessionId?: string;
  automationJobId?: string;
  dedupEnabled?: boolean;
  isCancelled?: () => boolean;
  onStageChange?: (stage: string, message: string) => void | Promise<void>;
  onLeadSaved?: (saved: number, duplicates: number, rejected: number) => void | Promise<void>;
  prioritizeFirst?: number;
  detailConcurrency?: number;
  onLeadExtracted?: (lead: ScraperLead) => void | Promise<void>;
  skipEnrichment?: boolean;
  maxResults?: number;
  resumeSessionId?: string;
  onProgress?: (progress: {
    found: number;
    saved: number;
    duplicates: number;
    scrollPercent: number;
    currentBusiness: string;
  }) => void | Promise<void>;
  onEndDetected?: () => void | Promise<void>;
  onSearchCompleted?: () => void | Promise<void>;
}

export interface ScrapeContext {
  sessionId: string;
  keyword: string;
  location: string;
  state?: string;
  city?: string;
  area?: string;
  country?: string;
  businessType: string;
  sources: string[];
  fullSearchQuery: string;
  semanticKeyword?: string;
}

export interface BrowserStats {
  browserAlive: boolean;
  contexts: number;
  activeContexts: number;
  idleContexts: number;
  totalPagesCreated: number;
  totalPagesClosed: number;
  activePages: number;
  browserCrashes: number;
  memoryUsageMB: number;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffFactor: 2,
};

export const NON_RETRYABLE_ERRORS = [
  'invalid query',
  'invalid keyword',
  'invalid location',
  'empty keyword',
  'empty location',
  'bad request',
  'invalid source',
  'validation failed',
  'no results found',
  'invalid selector',
];

export const MAX_CONCURRENCY = {
  'google-maps': 2,
  'justdial': 2,
  'indiamart': 1,
};
