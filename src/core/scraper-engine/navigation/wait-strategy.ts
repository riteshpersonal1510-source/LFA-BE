import { Page } from 'playwright';

export async function waitForResultsFeed(page: Page, timeoutMs: number = 10000): Promise<boolean> {
  try {
    await page.waitForSelector('[role="feed"]', { timeout: timeoutMs });
    return true;
  } catch {
    return false;
  }
}

export async function waitForBusinessCards(page: Page, minCards: number = 1, timeoutMs: number = 8000): Promise<number> {
  try {
    await page.waitForFunction(
      (min: number) => {
        const feed = document.querySelector('[role="feed"]');
        if (!feed) return false;
        const links = feed.querySelectorAll('a[href*="/maps/place/"]');
        return links.length >= min;
      },
      minCards,
      { timeout: timeoutMs },
    );

    const count = await page.evaluate(() => {
      const feed = document.querySelector('[role="feed"]');
      if (!feed) return 0;
      return feed.querySelectorAll('a[href*="/maps/place/"]').length;
    });
    return count;
  } catch {
    const current = await page.evaluate(() => {
      const feed = document.querySelector('[role="feed"]');
      if (!feed) return 0;
      return feed.querySelectorAll('a[href*="/maps/place/"]').length;
    }).catch(() => 0);
    return current;
  }
}

export async function waitForSearchBox(page: Page, timeoutMs: number = 5000): Promise<boolean> {
  const selectors = [
    '#searchboxinput',
    'input[name="q"]',
    'input[aria-label*="Search"]',
    'input[placeholder*="Search"]',
    'div#searchbox input',
  ];

  for (const selector of selectors) {
    try {
      await page.waitForSelector(selector, { timeout: timeoutMs });
      return true;
    } catch {
      continue;
    }
  }
  return false;
}

export async function waitForPageStable(page: Page, timeoutMs: number = 5000): Promise<void> {
  try {
    await page.evaluate((timeout: number) => {
      return new Promise<void>((resolve) => {
        const observer = new MutationObserver(() => {
          clearTimeout(timer);
          timer = setTimeout(() => {
            observer.disconnect();
            resolve();
          }, 500);
        });

        let timer = setTimeout(() => {
          observer.disconnect();
          resolve();
        }, timeout);

        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: false,
        });
      });
    }, timeoutMs);
  } catch {
    await page.waitForLoadState('domcontentloaded').catch(() => {});
  }
}

export async function waitForDetailPanel(page: Page, timeoutMs: number = 8000): Promise<boolean> {
  const selectors = [
    '[role="main"] h1',
    'button[data-item-id*="address"]',
    'div.lMbq3e',
    'div.TIHn2',
    'div[class*="business"]',
    'div[role="main"]',
  ];

  for (const selector of selectors) {
    try {
      await page.waitForSelector(selector, { timeout: timeoutMs });
      return true;
    } catch {
      continue;
    }
  }
  return false;
}

export async function waitForNavigationComplete(page: Page, url?: string, timeoutMs: number = 15000): Promise<boolean> {
  try {
    const promises: Promise<unknown>[] = [
      page.waitForLoadState('networkidle', { timeout: timeoutMs }).catch(() => {}),
    ];

    if (url) {
      promises.push(
        page.waitForURL(url, { timeout: timeoutMs }).catch(() => {}),
      );
    }

    await Promise.allSettled(promises);
    return true;
  } catch {
    return false;
  }
}

export async function waitForContentStable(page: Page, selector: string, timeoutMs: number = 5000): Promise<boolean> {
  try {
    await page.evaluate(({ sel, timeout }: { sel: string; timeout: number }) => {
      return new Promise<void>((resolve) => {
        const target = document.querySelector(sel);
        if (!target) {
          resolve();
          return;
        }

        const observer = new MutationObserver(() => {
          clearTimeout(timer);
          timer = setTimeout(() => {
            observer.disconnect();
            resolve();
          }, 300);
        });

        let timer = setTimeout(() => {
          observer.disconnect();
          resolve();
        }, timeout);

        observer.observe(target, {
          childList: true,
          subtree: true,
          attributes: false,
        });
      });
    }, { sel: selector, timeout: timeoutMs });
    return true;
  } catch {
    return false;
  }
}

export async function waitForListUpdate(page: Page, currentCount: number, timeoutMs: number = 5000): Promise<number> {
  try {
    await page.waitForFunction(
      (min: number) => {
        const feed = document.querySelector('[role="feed"]');
        if (!feed) return false;
        return feed.querySelectorAll('a[href*="/maps/place/"]').length > min;
      },
      currentCount,
      { timeout: timeoutMs },
    );

    return await page.evaluate(() => {
      const feed = document.querySelector('[role="feed"]');
      if (!feed) return 0;
      return feed.querySelectorAll('a[href*="/maps/place/"]').length;
    });
  } catch {
    return currentCount;
  }
}
