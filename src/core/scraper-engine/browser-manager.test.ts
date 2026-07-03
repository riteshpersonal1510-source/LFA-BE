import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockChromium = vi.hoisted(() => ({
  launch: vi.fn(),
}));

vi.mock('playwright', () => ({
  chromium: mockChromium,
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { BrowserManager } from './browser-manager';

function createMockBrowser() {
  const mockContext = {
    newPage: vi.fn().mockRejectedValue(new Error('not called in this test')),
    close: vi.fn(),
    addInitScript: vi.fn(),
  };
  const mockPage = {
    close: vi.fn(),
    setDefaultTimeout: vi.fn(),
    setDefaultNavigationTimeout: vi.fn(),
    route: vi.fn(),
    goto: vi.fn(),
    evaluate: vi.fn(),
    $: vi.fn(),
    waitForSelector: vi.fn(),
  };
  const mockBrowser = {
    newContext: vi.fn().mockResolvedValue(mockContext),
    close: vi.fn(),
    isConnected: vi.fn().mockReturnValue(true),
    contexts: vi.fn().mockReturnValue([]),
    on: vi.fn(),
  };
  mockContext.newPage.mockResolvedValue(mockPage);
  return { mockBrowser, mockContext, mockPage };
}

describe('BrowserManager', () => {
  let manager: BrowserManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new BrowserManager();
  });

  afterEach(async () => {
    await manager.shutdown();
  });

  describe('initial state', () => {
    it('starts with no browser', () => {
      const status = manager.getStatus();
      expect(status.browserAlive).toBe(false);
      expect(status.contexts).toBe(0);
      expect(status.activePages).toBe(0);
    });
  });

  describe('acquire', () => {
    it('launches browser on first acquire', async () => {
      const { mockBrowser, mockPage } = createMockBrowser();
      mockChromium.launch.mockResolvedValue(mockBrowser);

      const result = await manager.acquire('test-source');

      expect(mockChromium.launch).toHaveBeenCalledTimes(1);
      expect(result.page).toBe(mockPage);
      expect(mockBrowser.newContext).toHaveBeenCalledTimes(1);
    });

    it('reuses existing browser on subsequent acquires', async () => {
      const { mockBrowser, mockContext, mockPage: page1 } = createMockBrowser();
      const page2 = { ...page1, close: vi.fn() };
      mockContext.newPage
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2);
      mockChromium.launch.mockResolvedValue(mockBrowser);

      await manager.acquire('test-source');
      await manager.acquire('test-source');

      expect(mockChromium.launch).toHaveBeenCalledTimes(1);
      expect(mockContext.newPage).toHaveBeenCalledTimes(2);
    });
  });

  describe('release', () => {
    it('closes the page on release', async () => {
      const { mockBrowser, mockPage } = createMockBrowser();
      mockChromium.launch.mockResolvedValue(mockBrowser);

      const { page } = await manager.acquire('test-source');
      await manager.release(page, 'test-source');

      expect(mockPage.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('reset', () => {
    it('shuts down browser and restarts cleanup timer', async () => {
      const { mockBrowser, mockPage } = createMockBrowser();
      mockChromium.launch.mockResolvedValue(mockBrowser);

      await manager.acquire('test-source');

      await manager.reset();

      expect(mockBrowser.close).toHaveBeenCalledTimes(1);
      const status = manager.getStatus();
      expect(status.browserAlive).toBe(false);
      expect(status.contexts).toBe(0);
    });

    it('can be called when no browser is active', async () => {
      await manager.reset();
      const status = manager.getStatus();
      expect(status.browserAlive).toBe(false);
    });
  });

  describe('shutdown', () => {
    it('cleans up all resources', async () => {
      const { mockBrowser, mockPage } = createMockBrowser();
      mockChromium.launch.mockResolvedValue(mockBrowser);

      await manager.acquire('test-source');
      await manager.shutdown();

      expect(mockBrowser.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('getStatus', () => {
    it('returns structured status object', async () => {
      const { mockBrowser, mockPage } = createMockBrowser();
      mockChromium.launch.mockResolvedValue(mockBrowser);

      const status = manager.getStatus();
      expect(status).toHaveProperty('browserAlive');
      expect(status).toHaveProperty('contexts');
      expect(status).toHaveProperty('activePages');
      expect(status).toHaveProperty('totalPagesCreated');
      expect(status).toHaveProperty('totalPagesClosed');
      expect(status).toHaveProperty('browserCrashes');
      expect(status).toHaveProperty('memoryUsageMB');
    });
  });

  describe('acquireMultiple', () => {
    it('acquires multiple pages', async () => {
      const { mockBrowser, mockContext, mockPage } = createMockBrowser();
      mockChromium.launch.mockResolvedValue(mockBrowser);
      mockContext.newPage.mockResolvedValue(mockPage);

      const pages = await manager.acquireMultiple('test', 3);

      expect(pages).toHaveLength(3);
      expect(mockContext.newPage).toHaveBeenCalledTimes(3);
    });
  });

  describe('releaseAll', () => {
    it('releases multiple pages', async () => {
      const { mockBrowser, mockContext } = createMockBrowser();
      const page1 = { close: vi.fn(), setDefaultTimeout: vi.fn(), setDefaultNavigationTimeout: vi.fn(), route: vi.fn() };
      const page2 = { close: vi.fn(), setDefaultTimeout: vi.fn(), setDefaultNavigationTimeout: vi.fn(), route: vi.fn() };
      mockContext.newPage
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2);
      mockChromium.launch.mockResolvedValue(mockBrowser);

      await manager.acquire('test');
      await manager.acquire('test');
      await manager.releaseAll([page1, page2], 'test');

      expect(page1.close).toHaveBeenCalledTimes(1);
      expect(page2.close).toHaveBeenCalledTimes(1);
    });
  });
});
