export { getSourcesForCountry, validateSources, INDIA_SOURCES, INTERNATIONAL_SOURCES, ALL_SOURCES, isIndiaCountry } from './source-router';
export { MergeEngine, MergedLead } from './merge-engine';
export { BackgroundEnrichmentWorker } from './background-enrichment';

import { MergeEngine } from './merge-engine';
import { BackgroundEnrichmentWorker } from './background-enrichment';

export const mergeEngine = new MergeEngine();
export const backgroundEnrichmentWorker = new BackgroundEnrichmentWorker();
