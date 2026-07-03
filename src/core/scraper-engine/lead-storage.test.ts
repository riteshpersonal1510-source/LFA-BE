import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../models/Lead', () => ({
  Lead: {
    insertMany: vi.fn().mockResolvedValue([{ _id: 'mock-id-1' }, { _id: 'mock-id-2' }]),
    find: vi.fn().mockResolvedValue([]),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('./lead-normalizer', () => ({
  leadNormalizer: {
    normalize: vi.fn((lead: any) => lead),
    getDedupKey: vi.fn((lead: any) => [`name:${(lead.companyName || '').toLowerCase().replace(/\s+/g, '')}`]),
  },
}));

vi.mock('../../services/ai-processing-queue.service', () => ({
  aiProcessingQueue: {
    enqueueLead: vi.fn(),
  },
}));

vi.mock('../../services/search-status.service', () => ({
  searchStatus: {
    incrementSaved: vi.fn(),
    incrementDuplicates: vi.fn(),
    incrementFailed: vi.fn(),
    addLiveLead: vi.fn(),
  },
}));

vi.mock('../../services/business-email-discovery.service', () => ({
  businessEmailDiscoveryService: {
    discoverEmailsForLead: vi.fn(),
  },
}));

vi.mock('../../modules/automation-monitor/monitor-engine', () => ({
  monitorEngine: {
    onLeadSaved: vi.fn(),
    onDuplicateSkipped: vi.fn(),
  },
}));

import { LeadStorage } from './lead-storage';
import type { ScraperLead } from './types';

describe('LeadStorage', () => {
  let storage: LeadStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new LeadStorage();
  });

  describe('clearSessionCache', () => {
    it('clears dedup and normalizer caches without error', () => {
      expect(() => storage.clearSessionCache()).not.toThrow();
    });
  });

  describe('validateLead', () => {
    it('rejects leads with empty company name', () => {
      const lead: ScraperLead = { companyName: '', source: 'google-maps', address: '' };
      expect((storage as any).validateLead(lead)).toBe(false);
    });

    it('rejects leads with very short name', () => {
      const lead: ScraperLead = { companyName: 'A', source: 'google-maps', address: '' };
      expect((storage as any).validateLead(lead)).toBe(false);
    });

    it('accepts valid leads', () => {
      const lead: ScraperLead = { companyName: 'Test Business', source: 'google-maps', address: '' };
      expect((storage as any).validateLead(lead)).toBe(true);
    });
  });

  describe('storeLeads', () => {
    it('returns empty result for empty input', async () => {
      const result = await storage.storeLeads([], {
        keyword: 'test',
        location: '',
        businessType: 'test',
      });
      expect(result.totalStored).toBe(0);
      expect(result.totalDuplicates).toBe(0);
    });
  });

  describe('dedup cache', () => {
    it('correctly identifies duplicates inline', () => {
      const key1 = ['name:testbusiness'];
      const key2 = ['name:testbusiness'];

      expect((storage as any).checkDedupCache(key1)).toBe(false);
      (storage as any).addToDedupCache(key1);
      expect((storage as any).checkDedupCache(key2)).toBe(true);
    });

    it('clears cache when max size exceeded', () => {
      const maxSize = 50000;
      for (let i = 0; i <= maxSize; i++) {
        (storage as any).dedupCache.add(`key-${i}`);
      }
      expect((storage as any).dedupCache.size).toBeGreaterThan(0);
      (storage as any).addToDedupCache(['new-key']);
      expect((storage as any).dedupCache.size).toBeLessThan(10);
    });
  });
});
