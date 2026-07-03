import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('playwright', () => ({ chromium: { launch: vi.fn() } }));

vi.mock('../../../../../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../browser-manager', () => ({
  browserManager: {
    acquire: vi.fn(), acquireFresh: vi.fn(), acquireMultiple: vi.fn(),
    release: vi.fn(), releaseAll: vi.fn(),
  },
}));

vi.mock('../../lead-storage', () => ({
  leadStorage: { storeLeads: vi.fn(), enrichLeads: vi.fn() },
}));

vi.mock('path', () => ({ resolve: vi.fn(), join: vi.fn() }));
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

import { GoogleMapsScraper } from './scraper';

function mockPage(overrides: Record<string, unknown> = {}) {
  return {
    url: vi.fn().mockReturnValue('https://www.google.com/maps/search/test'),
    title: vi.fn().mockResolvedValue('Test Title'),
    evaluate: vi.fn().mockResolvedValue(''),
    goto: vi.fn().mockResolvedValue(undefined),
    $: vi.fn().mockResolvedValue(null),
    $$: vi.fn().mockResolvedValue([]),
    waitForSelector: vi.fn().mockRejectedValue(new Error('timeout')),
    waitForTimeout: vi.fn().mockResolvedValue(undefined),
    waitForFunction: vi.fn(),
    setDefaultTimeout: vi.fn(),
    setDefaultNavigationTimeout: vi.fn(),
    route: vi.fn(),
    screenshot: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
    keyboard: { type: vi.fn(), press: vi.fn() },
    click: vi.fn(),
    fill: vi.fn(),
    ...overrides,
  };
}

async function detectBlocking(scraper: GoogleMapsScraper, page: ReturnType<typeof mockPage>) {
  return await (scraper as any).detectBlocking(page);
}

describe('GoogleMapsScraper', () => {
  let scraper: GoogleMapsScraper;

  beforeEach(() => {
    vi.clearAllMocks();
    scraper = new GoogleMapsScraper();
  });

  describe('detectBlocking', () => {
    it('returns not blocked for normal Google Maps page', async () => {
      const page = mockPage({ evaluate: vi.fn().mockResolvedValue('<div>results</div>') });
      const result = await detectBlocking(scraper, page);
      expect(result.blocked).toBe(false);
    });

    it('detects SIGN_IN from accounts.google.com URL', async () => {
      const page = mockPage({
        url: vi.fn().mockReturnValue('https://accounts.google.com/ServiceLogin'),
        title: vi.fn().mockResolvedValue('Sign in'),
      });
      const result = await detectBlocking(scraper, page);
      expect(result.blocked).toBe(true);
      expect(result.type).toBe('SIGN_IN');
    });

    it('detects CAPTCHA from /sorry URL', async () => {
      const page = mockPage({
        url: vi.fn().mockReturnValue('https://www.google.com/sorry/index'),
        title: vi.fn().mockResolvedValue('Sorry'),
      });
      const result = await detectBlocking(scraper, page);
      expect(result.blocked).toBe(true);
      expect(result.type).toBe('CAPTCHA');
    });

    it('detects CONSENT from consent.google.com URL', async () => {
      const page = mockPage({
        url: vi.fn().mockReturnValue('https://consent.google.com/ml'),
        title: vi.fn().mockResolvedValue('Consent'),
      });
      const result = await detectBlocking(scraper, page);
      expect(result.blocked).toBe(true);
      expect(result.type).toBe('CONSENT');
    });

    it('detects SIGN_IN from page text', async () => {
      const page = mockPage({ evaluate: vi.fn().mockResolvedValue('Please sign in to continue') });
      const result = await detectBlocking(scraper, page);
      expect(result.blocked).toBe(true);
      expect(result.type).toBe('SIGN_IN');
    });

    it('detects CAPTCHA from page text', async () => {
      const page = mockPage({ evaluate: vi.fn().mockResolvedValue('Verify you are human') });
      const result = await detectBlocking(scraper, page);
      expect(result.blocked).toBe(true);
      expect(result.type).toBe('CAPTCHA');
    });

    it('detects RATE_LIMITED from unusual traffic text', async () => {
      const page = mockPage({ evaluate: vi.fn().mockResolvedValue('Unusual traffic from your network') });
      const result = await detectBlocking(scraper, page);
      expect(result.blocked).toBe(true);
      expect(result.type).toBe('RATE_LIMITED');
    });

    it('detects CONSENT from page text', async () => {
      const page = mockPage({ evaluate: vi.fn().mockResolvedValue('Before you continue Accept all') });
      const result = await detectBlocking(scraper, page);
      expect(result.blocked).toBe(true);
      expect(result.type).toBe('CONSENT');
    });

    it('handles evaluate error gracefully', async () => {
      const page = mockPage({ evaluate: vi.fn().mockRejectedValue(new Error('fail')) });
      const result = await detectBlocking(scraper, page);
      expect(result.blocked).toBe(false);
    });
  });

  describe('dismissConsent', () => {
    it('returns false when no consent button', async () => {
      const page = mockPage();
      const result = await (scraper as any).dismissConsent(page);
      expect(result).toBe(false);
    });

    it('clicks Accept all when found', async () => {
      const btn = { click: vi.fn().mockResolvedValue(undefined) };
      const page = mockPage({ $: vi.fn().mockResolvedValue(btn) });
      const result = await (scraper as any).dismissConsent(page);
      expect(result).toBe(true);
      expect(btn.click).toHaveBeenCalled();
    });
  });

  describe('blockedResult', () => {
    it('returns failure result for SIGN_IN', () => {
      const info = { blocked: true, type: 'SIGN_IN', url: 'https://accounts.google.com/ServiceLogin', title: 'Sign in' };
      const result = (scraper as any).blockedResult(info);
      expect(result.success).toBe(false);
      expect(result.message).toContain('SIGN_IN');
      expect(result.sourceResults[0].error).toContain('SIGN_IN');
    });
  });

  describe('warmupPage', () => {
    it('navigates to google.com', async () => {
      const page = mockPage();
      await (scraper as any).warmupPage(page);
      expect(page.goto).toHaveBeenCalledWith('https://www.google.com', expect.any(Object));
    });

    it('does not throw on failure', async () => {
      const page = mockPage({ goto: vi.fn().mockRejectedValue(new Error('fail')) });
      await expect((scraper as any).warmupPage(page)).resolves.not.toThrow();
    });
  });
});
