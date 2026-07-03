import { describe, it, expect } from 'vitest';
import {
  SearchState,
  isValidTransition,
  assertValidTransition,
  isTerminal,
  isActive,
  searchStateToLegacyStatus,
} from './search-state-machine';

describe('SearchStateMachine', () => {
  describe('isValidTransition', () => {
    it('allows CREATING_SESSION -> QUEUED', () => {
      expect(isValidTransition(SearchState.CREATING_SESSION, SearchState.QUEUED)).toBe(true);
    });

    it('allows QUEUED -> STARTING_BROWSER', () => {
      expect(isValidTransition(SearchState.QUEUED, SearchState.STARTING_BROWSER)).toBe(true);
    });

    it('allows STARTING_BROWSER -> BROWSER_READY', () => {
      expect(isValidTransition(SearchState.STARTING_BROWSER, SearchState.BROWSER_READY)).toBe(true);
    });

    it('allows BROWSER_READY -> SEARCHING_GOOGLE_MAPS', () => {
      expect(isValidTransition(SearchState.BROWSER_READY, SearchState.SEARCHING_GOOGLE_MAPS)).toBe(true);
    });

    it('allows SEARCHING_GOOGLE_MAPS -> SCRAPING_RESULTS', () => {
      expect(isValidTransition(SearchState.SEARCHING_GOOGLE_MAPS, SearchState.SCRAPING_RESULTS)).toBe(true);
    });

    it('allows SCRAPING_RESULTS -> PROCESSING_RESULTS', () => {
      expect(isValidTransition(SearchState.SCRAPING_RESULTS, SearchState.PROCESSING_RESULTS)).toBe(true);
    });

    it('allows PROCESSING_RESULTS -> SAVING_LEADS', () => {
      expect(isValidTransition(SearchState.PROCESSING_RESULTS, SearchState.SAVING_LEADS)).toBe(true);
    });

    it('allows SAVING_LEADS -> COMPLETED', () => {
      expect(isValidTransition(SearchState.SAVING_LEADS, SearchState.COMPLETED)).toBe(true);
    });

    it('allows any active state -> FAILED', () => {
      for (const state of [
        SearchState.CREATING_SESSION,
        SearchState.QUEUED,
        SearchState.STARTING_BROWSER,
        SearchState.BROWSER_READY,
        SearchState.SEARCHING_GOOGLE_MAPS,
        SearchState.SCRAPING_RESULTS,
        SearchState.PROCESSING_RESULTS,
        SearchState.SAVING_LEADS,
      ]) {
        expect(isValidTransition(state, SearchState.FAILED)).toBe(true);
      }
    });

    it('allows any active state -> STOPPED', () => {
      for (const state of [
        SearchState.CREATING_SESSION,
        SearchState.QUEUED,
        SearchState.STARTING_BROWSER,
        SearchState.BROWSER_READY,
        SearchState.SEARCHING_GOOGLE_MAPS,
        SearchState.SCRAPING_RESULTS,
        SearchState.PROCESSING_RESULTS,
        SearchState.SAVING_LEADS,
      ]) {
        expect(isValidTransition(state, SearchState.STOPPED)).toBe(true);
      }
    });

    it('allows any active state -> GOOGLE_BLOCKED', () => {
      for (const state of [
        SearchState.CREATING_SESSION,
        SearchState.QUEUED,
        SearchState.STARTING_BROWSER,
        SearchState.BROWSER_READY,
        SearchState.SEARCHING_GOOGLE_MAPS,
        SearchState.SCRAPING_RESULTS,
        SearchState.PROCESSING_RESULTS,
        SearchState.SAVING_LEADS,
      ]) {
        expect(isValidTransition(state, SearchState.GOOGLE_BLOCKED)).toBe(true);
      }
    });

    it('allows STOPPED -> QUEUED (resume)', () => {
      expect(isValidTransition(SearchState.STOPPED, SearchState.QUEUED)).toBe(true);
    });

    it('rejects COMPLETED -> QUEUED', () => {
      expect(isValidTransition(SearchState.COMPLETED, SearchState.QUEUED)).toBe(false);
    });

    it('rejects FAILED -> anything', () => {
      expect(isValidTransition(SearchState.FAILED, SearchState.QUEUED)).toBe(false);
      expect(isValidTransition(SearchState.FAILED, SearchState.STOPPED)).toBe(false);
    });

    it('rejects IDLE -> COMPLETED', () => {
      expect(isValidTransition(SearchState.IDLE, SearchState.COMPLETED)).toBe(false);
    });

    it('rejects unknown transitions', () => {
      expect(isValidTransition(SearchState.IDLE as any, 'INVALID' as any)).toBe(false);
    });
  });

  describe('assertValidTransition', () => {
    it('does not throw for valid transitions', () => {
      expect(() => assertValidTransition(SearchState.QUEUED, SearchState.STARTING_BROWSER)).not.toThrow();
    });

    it('throws for invalid transitions', () => {
      expect(() => assertValidTransition(SearchState.COMPLETED, SearchState.QUEUED)).toThrow('Invalid search state transition');
    });
  });

  describe('isTerminal', () => {
    it('returns true for COMPLETED', () => {
      expect(isTerminal(SearchState.COMPLETED)).toBe(true);
    });

    it('returns true for FAILED', () => {
      expect(isTerminal(SearchState.FAILED)).toBe(true);
    });

    it('returns true for STOPPED', () => {
      expect(isTerminal(SearchState.STOPPED)).toBe(true);
    });

    it('returns false for active states', () => {
      expect(isTerminal(SearchState.QUEUED)).toBe(false);
      expect(isTerminal(SearchState.SEARCHING_GOOGLE_MAPS)).toBe(false);
    });
  });

  describe('isActive', () => {
    it('returns true for active states', () => {
      expect(isActive(SearchState.CREATING_SESSION)).toBe(true);
      expect(isActive(SearchState.SAVING_LEADS)).toBe(true);
    });

    it('returns false for terminal states', () => {
      expect(isActive(SearchState.COMPLETED)).toBe(false);
      expect(isActive(SearchState.FAILED)).toBe(false);
      expect(isActive(SearchState.STOPPED)).toBe(false);
    });

    it('returns false for IDLE', () => {
      expect(isActive(SearchState.IDLE)).toBe(false);
    });
  });

  describe('searchStateToLegacyStatus', () => {
    it('maps COMPLETED to completed', () => {
      expect(searchStateToLegacyStatus(SearchState.COMPLETED)).toBe('completed');
    });

    it('maps FAILED to failed', () => {
      expect(searchStateToLegacyStatus(SearchState.FAILED)).toBe('failed');
    });

    it('maps STOPPED to stopped', () => {
      expect(searchStateToLegacyStatus(SearchState.STOPPED)).toBe('stopped');
    });

    it('maps any active state to running', () => {
      expect(searchStateToLegacyStatus(SearchState.QUEUED)).toBe('running');
      expect(searchStateToLegacyStatus(SearchState.SEARCHING_GOOGLE_MAPS)).toBe('running');
    });
  });
});
