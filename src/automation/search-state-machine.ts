import { logger } from '../utils/logger';

export enum SearchState {
  IDLE = 'IDLE',
  CREATING_SESSION = 'CREATING_SESSION',
  QUEUED = 'QUEUED',
  STARTING_BROWSER = 'STARTING_BROWSER',
  BROWSER_READY = 'BROWSER_READY',
  SEARCHING_GOOGLE_MAPS = 'SEARCHING_GOOGLE_MAPS',
  SCRAPING_RESULTS = 'SCRAPING_RESULTS',
  PROCESSING_RESULTS = 'PROCESSING_RESULTS',
  SAVING_LEADS = 'SAVING_LEADS',
  NO_RESULTS = 'NO_RESULTS',
  COMPLETED = 'COMPLETED',
  STOPPED = 'STOPPED',
  FAILED = 'FAILED',
  TIMEOUT = 'TIMEOUT',
  GOOGLE_BLOCKED = 'GOOGLE_BLOCKED',
}

export const SEARCH_STATE_TRANSITIONS: Record<SearchState, SearchState[]> = {
  [SearchState.IDLE]: [SearchState.CREATING_SESSION],
  [SearchState.CREATING_SESSION]: [SearchState.QUEUED, SearchState.STOPPED, SearchState.FAILED, SearchState.TIMEOUT, SearchState.GOOGLE_BLOCKED],
  [SearchState.QUEUED]: [SearchState.STARTING_BROWSER, SearchState.STOPPED, SearchState.FAILED, SearchState.TIMEOUT, SearchState.GOOGLE_BLOCKED],
  [SearchState.STARTING_BROWSER]: [SearchState.BROWSER_READY, SearchState.STOPPED, SearchState.FAILED, SearchState.TIMEOUT, SearchState.GOOGLE_BLOCKED],
  [SearchState.BROWSER_READY]: [SearchState.SEARCHING_GOOGLE_MAPS, SearchState.STOPPED, SearchState.FAILED, SearchState.TIMEOUT, SearchState.GOOGLE_BLOCKED],
  [SearchState.SEARCHING_GOOGLE_MAPS]: [SearchState.SCRAPING_RESULTS, SearchState.STOPPED, SearchState.FAILED, SearchState.TIMEOUT, SearchState.GOOGLE_BLOCKED],
  [SearchState.SCRAPING_RESULTS]: [SearchState.PROCESSING_RESULTS, SearchState.STOPPED, SearchState.FAILED, SearchState.TIMEOUT, SearchState.GOOGLE_BLOCKED, SearchState.NO_RESULTS],
  [SearchState.PROCESSING_RESULTS]: [SearchState.SAVING_LEADS, SearchState.STOPPED, SearchState.FAILED, SearchState.TIMEOUT, SearchState.GOOGLE_BLOCKED],
  [SearchState.SAVING_LEADS]: [SearchState.COMPLETED, SearchState.STOPPED, SearchState.FAILED, SearchState.TIMEOUT, SearchState.GOOGLE_BLOCKED],
  [SearchState.NO_RESULTS]: [],
  [SearchState.COMPLETED]: [],
  [SearchState.STOPPED]: [SearchState.QUEUED],
  [SearchState.FAILED]: [],
  [SearchState.TIMEOUT]: [],
  [SearchState.GOOGLE_BLOCKED]: [],
};

export const TERMINAL_STATES: Set<SearchState> = new Set([
  SearchState.COMPLETED,
  SearchState.NO_RESULTS,
  SearchState.STOPPED,
  SearchState.FAILED,
  SearchState.TIMEOUT,
  SearchState.GOOGLE_BLOCKED,
]);

export const ACTIVE_STATES: Set<SearchState> = new Set([
  SearchState.CREATING_SESSION,
  SearchState.QUEUED,
  SearchState.STARTING_BROWSER,
  SearchState.BROWSER_READY,
  SearchState.SEARCHING_GOOGLE_MAPS,
  SearchState.SCRAPING_RESULTS,
  SearchState.PROCESSING_RESULTS,
  SearchState.SAVING_LEADS,
]);

export function isValidTransition(from: SearchState, to: SearchState): boolean {
  return SEARCH_STATE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertValidTransition(from: SearchState, to: SearchState): void {
  if (!isValidTransition(from, to)) {
    const msg =
      `Invalid search state transition: ${from} -> ${to}. ` +
      `Allowed transitions from ${from}: [${SEARCH_STATE_TRANSITIONS[from]?.join(', ') || 'none'}]`;
    logger.error({ from, to, allowed: SEARCH_STATE_TRANSITIONS[from] }, msg);
    throw new Error(msg);
  }
}

export function isTerminal(state: SearchState): boolean {
  return TERMINAL_STATES.has(state);
}

export function isActive(state: SearchState): boolean {
  return ACTIVE_STATES.has(state);
}

export function searchStateToLegacyStatus(state: SearchState): 'running' | 'completed' | 'failed' | 'stopped' {
  if (state === SearchState.COMPLETED || state === SearchState.NO_RESULTS) return 'completed';
  if (state === SearchState.FAILED || state === SearchState.TIMEOUT || state === SearchState.GOOGLE_BLOCKED) return 'failed';
  if (state === SearchState.STOPPED) return 'stopped';
  return 'running';
}

export function searchStateToFinalStatus(state: SearchState): 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'STOPPED' | 'CANCELLED' | 'TIMEOUT' | 'PARTIAL_SUCCESS' | 'NO_RESULTS' {
  if (state === SearchState.QUEUED) return 'QUEUED';
  if (state === SearchState.COMPLETED) return 'COMPLETED';
  if (state === SearchState.NO_RESULTS) return 'NO_RESULTS';
  if (state === SearchState.TIMEOUT) return 'TIMEOUT';
  if (state === SearchState.GOOGLE_BLOCKED) return 'FAILED';
  if (state === SearchState.FAILED) return 'FAILED';
  if (state === SearchState.STOPPED) return 'STOPPED';
  return 'RUNNING';
}
