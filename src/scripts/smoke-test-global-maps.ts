/**
 * Playwright smoke test: verify Google Maps loads result feeds for global queries.
 * Run: npx tsx src/scripts/smoke-test-global-maps.ts
 */

import { chromium } from 'playwright';
import { buildMapsSearchQuery } from '../utils/location-query-builder';

const CASES = [
  { keyword: 'Gym', country: 'India', state: 'Gujarat', city: 'Ahmedabad' },
  { keyword: 'Dentist', country: 'United Kingdom', city: 'London' },
  { keyword: 'Restaurant', country: 'United Arab Emirates', city: 'Dubai' },
  { keyword: 'Travel Agency', country: 'United States', state: 'New Mexico', city: 'Las Vegas' },
  { keyword: 'Hotel', country: 'Japan', city: 'Tokyo' },
  { keyword: 'Real Estate', country: 'Australia', state: 'New South Wales', city: 'Sydney' },
];

async function smokeTest(): Promise<void> {
  console.log('=== Google Maps Global Navigation Smoke Test ===\n');

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({
    locale: 'en-US',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  let passed = 0;

  for (const tc of CASES) {
    const { searchQuery } = buildMapsSearchQuery(tc.keyword, tc);
    const url = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(2000);

      for (const sel of ['button:has-text("Accept all")', 'button:has-text("I agree")', 'button:has-text("Reject all")']) {
        const btn = await page.$(sel).catch(() => null);
        if (btn) {
          await btn.click().catch(() => {});
          await page.waitForTimeout(1500);
          break;
        }
      }

      const result = await page.evaluate(() => {
        const url = window.location.href;
        const onMaps = url.includes('google.com/maps');
        const feed = document.querySelector('[role="feed"]');
        const cards = document.querySelectorAll('a[href*="maps/place/"]').length;
        const bodyText = document.body?.innerText || '';
        const hardBlocked = /unusual traffic|captcha|403 forbidden|sign in to continue using google/i.test(bodyText);
        const noResults = /no results|did not match|try adjusting/i.test(bodyText);
        return { onMaps, feedFound: !!feed, cards, hardBlocked, noResults, title: document.title };
      });

      const ok = result.onMaps && !result.hardBlocked && (result.feedFound || result.cards > 0) && !result.noResults;

      console.log(`[${ok ? 'PASS' : 'FAIL'}] ${tc.city}, ${tc.country}`);
      console.log(`  Query: ${searchQuery}`);
      console.log(`  Feed: ${result.feedFound}, Cards: ${result.cards}, HardBlocked: ${result.hardBlocked}, NoResults: ${result.noResults}`);
      console.log('');

      if (ok) passed++;
    } catch (err) {
      console.log(`[FAIL] ${tc.city}, ${tc.country}`);
      console.log(`  Error: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }

  await browser.close();

  console.log(`=== Smoke Results: ${passed}/${CASES.length} passed ===`);
  process.exit(passed === CASES.length ? 0 : 1);
}

smokeTest().catch((err) => {
  console.error(err);
  process.exit(1);
});
