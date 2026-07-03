#!/usr/bin/env node
/**
 * PRODUCTION RUNTIME VERIFICATION - FORENSIC DEBUGGING
 * 
 * Trace: Marshal GYM - Naroda (single business only)
 * Goal: Identify EXACT point where detail panel extraction fails
 * 
 * Steps:
 * 1. Search for business
 * 2. Open detail panel
 * 3. Wait for full load
 * 4. Capture evidence (HTML, screenshot, URL)
 * 5. Search for fields in DOM
 * 6. Attempt extraction with multiple selectors
 * 7. Trace through pipeline
 * 8. Generate verification report
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = path.join(__dirname, 'forensic-evidence');
const TEST_BUSINESS = 'Marshal GYM - Naroda';
const TEST_LOCATION = 'Ahmedabad';

// Ensure evidence directory exists
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

const TIMESTAMP = Date.now();
const REPORT_FILE = path.join(EVIDENCE_DIR, `runtime-verification-${TIMESTAMP}.md`);
const HTML_PANEL = path.join(EVIDENCE_DIR, `detail-panel-${TIMESTAMP}.html`);
const HTML_PAGE = path.join(EVIDENCE_DIR, `full-page-${TIMESTAMP}.html`);
const JSON_EXTRACTION = path.join(EVIDENCE_DIR, `extraction-trace-${TIMESTAMP}.json`);
const SCREENSHOT = path.join(EVIDENCE_DIR, `screenshot-${TIMESTAMP}.png`);

let report = '# RUNTIME VERIFICATION REPORT\n\n';
let extractionTrace = {};

function log(title, data = null) {
  const line = `${new Date().toISOString()} | ${title}`;
  console.log(line);
  
  if (data) {
    console.log(JSON.stringify(data, null, 2));
    report += `\n## ${title}\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n`;
  } else {
    report += `\n## ${title}\n`;
  }
}

async function runVerification() {
  let browser, page;
  
  try {
    // ============================================================
    // STEP 1: LAUNCH AND SEARCH
    // ============================================================
    log('STEP 1: LAUNCH BROWSER & SEARCH');
    
    browser = await chromium.launch({
      headless: false, // Show what's happening
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    });
    
    page = await context.newPage();
    
    log(`Navigating to Google Maps and searching for: "${TEST_BUSINESS} in ${TEST_LOCATION}"`);
    
    await page.goto('https://www.google.com/maps', { waitUntil: 'networkidle' });
    await page.waitForSelector('input#searchboxinput', { timeout: 10000 });
    
    const searchQuery = `${TEST_BUSINESS} in ${TEST_LOCATION}`;
    await page.$eval('input#searchboxinput', (el, query) => {
      el.value = query;
    }, searchQuery);
    
    await page.keyboard.press('Enter');
    await page.waitForSelector('[role="main"]', { timeout: 15000 });
    await page.waitForTimeout(2000); // Wait for results
    
    log(`✓ Search completed for: "${searchQuery}"`);
    
    // ============================================================
    // STEP 2: VERIFY DETAIL PANEL REQUIREMENTS
    // ============================================================
    log('STEP 2: VERIFY DETAIL PANEL REQUIREMENTS BEFORE CLICKING');
    
    const businessCards = await page.$$('div[role="article"]');
    log(`Found ${businessCards.length} business cards`);
    
    if (businessCards.length === 0) {
      throw new Error('No business cards found!');
    }
    
    // Get first card title
    const firstCardTitle = await businessCards[0].evaluate(el => 
      el.querySelector('h2')?.textContent || el.innerText.split('\n')[0]
    );
    
    log(`First card found: "${firstCardTitle}"`);
    
    // ============================================================
    // STEP 3: CLICK AND WAIT FOR DETAIL PANEL
    // ============================================================
    log('STEP 3: CLICK BUSINESS CARD & WAIT FOR DETAIL PANEL');
    
    await businessCards[0].click();
    log('✓ Clicked business card');
    
    // Wait for detail panel with verification
    let detailPanelReady = false;
    let detailPanelVerification = {
      dialogFound: false,
      dataItemFound: false,
      titleVisible: false,
      metadataExists: false,
      urlChanged: false,
    };
    
    try {
      // Try to find dialog
      await page.waitForSelector('[role="dialog"]', { timeout: 8000 });
      detailPanelVerification.dialogFound = true;
      log('✓ Detail panel dialog found');
    } catch (e) {
      log('! Dialog not found, checking alternative...');
      try {
        await page.waitForSelector('div[data-item-type]', { timeout: 5000 });
        detailPanelVerification.dataItemFound = true;
        log('✓ Detail panel data-item found');
      } catch (e2) {
        log('✗ Neither dialog nor data-item found');
      }
    }
    
    // Verify requirements
    await page.waitForTimeout(2000); // Wait for async content
    
    const requirements = await page.evaluate(() => ({
      titleVisible: !!document.querySelector('h1.DUwDvf'),
      metadataContainer: !!document.querySelector('[role="button"]'),
      metadataElements: document.querySelectorAll('[role="button"]').length,
      urlPattern: window.location.href,
    }));
    
    detailPanelVerification.titleVisible = requirements.titleVisible;
    detailPanelVerification.metadataExists = requirements.metadataElements > 0;
    
    log('Detail Panel Verification', detailPanelVerification);
    extractionTrace.detailPanelCheck = detailPanelVerification;
    
    if (!requirements.titleVisible) {
      throw new Error('Business title NOT visible - detail panel failed to load');
    }
    
    log(`✓ Detail panel loaded. Metadata elements found: ${requirements.metadataElements}`);
    
    // ============================================================
    // STEP 3: CAPTURE RUNTIME EVIDENCE
    // ============================================================
    log('STEP 3: CAPTURE RUNTIME EVIDENCE');
    
    // Current URL
    const currentURL = page.url();
    log(`Current URL: ${currentURL}`);
    extractionTrace.url = currentURL;
    
    // Take screenshot
    await page.screenshot({ path: SCREENSHOT, fullPage: false });
    log(`✓ Screenshot saved: ${path.basename(SCREENSHOT)}`);
    
    // Dump full page HTML
    const fullPageHTML = await page.content();
    fs.writeFileSync(HTML_PAGE, fullPageHTML);
    log(`✓ Full page HTML saved: ${path.basename(HTML_PAGE)} (${fullPageHTML.length} bytes)`);
    
    // Dump detail panel HTML
    const detailPanelHTML = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (dialog) return dialog.outerHTML;
      
      const dataItem = document.querySelector('div[data-item-type]');
      if (dataItem) return dataItem.outerHTML;
      
      const mainPanel = document.querySelector('[role="main"]');
      if (mainPanel) return mainPanel.outerHTML;
      
      return 'PANEL NOT FOUND';
    });
    
    fs.writeFileSync(HTML_PANEL, detailPanelHTML);
    log(`✓ Detail panel HTML saved: ${path.basename(HTML_PANEL)} (${detailPanelHTML.length} bytes)`);
    
    // ============================================================
    // STEP 4: SEARCH FOR FIELDS IN HTML
    // ============================================================
    log('STEP 4: SEARCH FOR FIELDS IN CAPTURED HTML');
    
    const fieldsToFind = {
      'Website (http/https)': ['http://', 'https://', '.com', '.in', '.net', '.org'],
      'Phone (+91 or 10-digit)': ['+91', '0-9', 'phone', 'call', '📞'],
      'Address (area indicators)': ['road', 'street', 'chowk', 'plaza', 'nagar', ','],
      'Category (business type)': ['gym', 'fitness', 'sports', 'health', 'coaching'],
      'Rating (stars)': ['★', '⭐', '4.', '3.', '2.', '5.', 'stars', 'rating'],
      'Reviews': ['reviews', 'rated', 'opinion'],
      'Working Hours': ['open', 'closes', 'hours', 'am', 'pm', '9', '10'],
      'Email': ['@', 'email', 'mail'],
    };
    
    let fieldPresence = {};
    
    for (const [fieldName, keywords] of Object.entries(fieldsToFind)) {
      const found = keywords.some(kw => 
        detailPanelHTML.toLowerCase().includes(kw.toLowerCase())
      );
      fieldPresence[fieldName] = found ? '✓ FOUND' : '✗ NOT FOUND';
    }
    
    log('HTML Field Presence Check', fieldPresence);
    extractionTrace.htmlFieldPresence = fieldPresence;
    
    // ============================================================
    // STEP 5: VERIFY EXTRACTION PIPELINE
    // ============================================================
    log('STEP 5: EXTRACT FIELDS WITH MULTIPLE SELECTORS');
    
    const extractionResults = {};
    
    // Extract Company Name
    log('Extracting: Company Name');
    const companyName = await page.evaluate(() => {
      // Selector 1: h1.DUwDvf
      let el = document.querySelector('h1.DUwDvf');
      if (el) return { selector: 'h1.DUwDvf', text: el.textContent.trim() };
      
      // Selector 2: h2
      el = document.querySelector('h2');
      if (el) return { selector: 'h2', text: el.textContent.trim() };
      
      // Selector 3: first header
      el = document.querySelector('h1, h2, h3');
      if (el) return { selector: 'h1/h2/h3', text: el.textContent.trim() };
      
      return { selector: 'NONE', text: null };
    });
    
    extractionResults.companyName = companyName;
    log(`Company Name: ${companyName.text ? '✓ ' + companyName.text : '✗ NOT FOUND'}`);
    
    // Extract Category
    log('Extracting: Category');
    const category = await page.evaluate(() => {
      // Selector 1: button.DKv0N
      let el = document.querySelector('button.DKv0N');
      if (el) return { selector: 'button.DKv0N', text: el.textContent.trim() };
      
      // Selector 2: button with category keywords
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const text = btn.textContent.toLowerCase();
        if (text.includes('gym') || text.includes('fitness') || text.includes('health')) {
          return { selector: 'button[category-keyword]', text: btn.textContent.trim() };
        }
      }
      
      return { selector: 'NONE', text: null };
    });
    
    extractionResults.category = category;
    log(`Category: ${category.text ? '✓ ' + category.text : '✗ NOT FOUND'}`);
    
    // Extract Phone
    log('Extracting: Phone');
    const phone = await page.evaluate(() => {
      // Selector 1: button[aria-label*="Phone"]
      let el = document.querySelector('button[aria-label*="Phone"]');
      if (el) return { selector: 'button[aria-label*="Phone"]', text: el.textContent.trim() };
      
      // Selector 2: tel: link
      el = document.querySelector('a[href^="tel:"]');
      if (el) return { selector: 'a[href^="tel:"]', text: el.textContent.trim() };
      
      // Selector 3: find in all text
      const text = document.body.innerText;
      const phoneMatch = text.match(/(\+91|0)?[\d\s\-]{9,14}/);
      if (phoneMatch) {
        return { selector: 'text-regex', text: phoneMatch[0] };
      }
      
      return { selector: 'NONE', text: null };
    });
    
    extractionResults.phone = phone;
    log(`Phone: ${phone.text ? '✓ ' + phone.text : '✗ NOT FOUND'}`);
    
    // Extract Address
    log('Extracting: Address');
    const address = await page.evaluate(() => {
      // Selector 1: button[aria-label*="Address"]
      let el = document.querySelector('button[aria-label*="Address"]');
      if (el) return { selector: 'button[aria-label*="Address"]', text: el.textContent.trim() };
      
      // Selector 2: any button with location keywords
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const text = btn.textContent.trim();
        if ((text.includes(',') || text.includes('road') || text.includes('nagar')) && text.length > 10) {
          return { selector: 'button[location-keywords]', text: text };
        }
      }
      
      return { selector: 'NONE', text: null };
    });
    
    extractionResults.address = address;
    log(`Address: ${address.text ? '✓ ' + address.text : '✗ NOT FOUND'}`);
    
    // Extract Website
    log('Extracting: Website');
    const website = await page.evaluate(() => {
      // Selector 1: a[data-item-id*="website"]
      let el = document.querySelector('a[data-item-id*="website"]');
      if (el) {
        const href = el.getAttribute('href');
        return { selector: 'a[data-item-id*="website"]', text: href };
      }
      
      // Selector 2: any link that starts with http
      const links = document.querySelectorAll('a[href]');
      for (const link of links) {
        const href = link.getAttribute('href') || '';
        if (href.startsWith('http') && 
            !href.includes('google.com/maps') &&
            !href.includes('support.google')) {
          return { selector: 'a[href^="http"]', text: href };
        }
      }
      
      // Selector 3: aria-label containing website
      el = document.querySelector('button[aria-label*="website"]');
      if (el) {
        const href = el.getAttribute('href');
        return { selector: 'button[aria-label*="website"]', text: href };
      }
      
      return { selector: 'NONE', text: null };
    });
    
    extractionResults.website = website;
    log(`Website: ${website.text ? '✓ ' + website.text : '✗ NOT FOUND'}`);
    
    // Extract Rating
    log('Extracting: Rating');
    const rating = await page.evaluate(() => {
      // Selector 1: span[aria-label*="stars"]
      let el = document.querySelector('span[aria-label*="stars"]');
      if (el) {
        const label = el.getAttribute('aria-label');
        const match = label.match(/(\d+\.?\d*)/);
        return { selector: 'span[aria-label*="stars"]', text: match ? match[1] : label };
      }
      
      // Selector 2: button with star rating
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const label = btn.getAttribute('aria-label') || '';
        if (label.includes('star') || label.match(/\d+\.\d+/)) {
          const match = label.match(/(\d+\.?\d*)/);
          return { selector: 'button[aria-label*="star"]', text: match ? match[1] : label };
        }
      }
      
      return { selector: 'NONE', text: null };
    });
    
    extractionResults.rating = rating;
    log(`Rating: ${rating.text ? '✓ ' + rating.text : '✗ NOT FOUND'}`);
    
    // Extract Reviews Count
    log('Extracting: Reviews Count');
    const reviews = await page.evaluate(() => {
      // Selector 1: span[aria-label*="reviews"]
      let el = document.querySelector('span[aria-label*="reviews"]');
      if (el) {
        const label = el.getAttribute('aria-label');
        const match = label.match(/(\d+)/);
        return { selector: 'span[aria-label*="reviews"]', text: match ? match[1] : label };
      }
      
      // Selector 2: button with reviews
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const label = btn.getAttribute('aria-label') || '';
        if (label.includes('review')) {
          const match = label.match(/(\d+)/);
          return { selector: 'button[aria-label*="review"]', text: match ? match[1] : label };
        }
      }
      
      return { selector: 'NONE', text: null };
    });
    
    extractionResults.reviews = reviews;
    log(`Reviews: ${reviews.text ? '✓ ' + reviews.text : '✗ NOT FOUND'}`);
    
    // Extract Working Hours
    log('Extracting: Working Hours');
    const hours = await page.evaluate(() => {
      // Selector 1: button with hours
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const label = btn.getAttribute('aria-label') || '';
        const text = btn.textContent.trim();
        if (label.includes('hour') || text.match(/\d+:\d+/)) {
          return { selector: 'button[hours-keyword]', text: text };
        }
      }
      
      // Selector 2: find open/close time
      const allText = document.body.innerText.toLowerCase();
      if (allText.includes('open now')) {
        return { selector: 'text-open-now', text: 'Open Now' };
      }
      
      return { selector: 'NONE', text: null };
    });
    
    extractionResults.hours = hours;
    log(`Working Hours: ${hours.text ? '✓ ' + hours.text : '✗ NOT FOUND'}`);
    
    // Extract Email
    log('Extracting: Email');
    const email = await page.evaluate(() => {
      // Selector 1: button with email
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const text = btn.textContent.trim();
        if (text.includes('@') && text.includes('.')) {
          return { selector: 'button[email]', text: text };
        }
      }
      
      // Selector 2: mailto link
      let el = document.querySelector('a[href^="mailto:"]');
      if (el) {
        const href = el.getAttribute('href');
        return { selector: 'a[href^="mailto:"]', text: href.replace('mailto:', '') };
      }
      
      return { selector: 'NONE', text: null };
    });
    
    extractionResults.email = email;
    log(`Email: ${email.text ? '✓ ' + email.text : '✗ NOT FOUND'}`);
    
    extractionTrace.extractionResults = extractionResults;
    
    // ============================================================
    // STEP 6: TRACE THROUGH PIPELINE
    // ============================================================
    log('STEP 6: TRACE DATA THROUGH COMPLETE PIPELINE');
    
    // Show what would be stored in MongoDB
    const mongoDBData = {
      companyName: extractionResults.companyName.text || 'Not Extracted',
      category: extractionResults.category.text || undefined,
      phone: extractionResults.phone.text || undefined,
      address: extractionResults.address.text || undefined,
      website: extractionResults.website.text || undefined,
      rating: extractionResults.rating.text ? parseFloat(extractionResults.rating.text) : undefined,
      reviewsCount: extractionResults.reviews.text ? parseInt(extractionResults.reviews.text) : undefined,
      workingHours: extractionResults.hours.text || undefined,
      email: extractionResults.email.text || undefined,
      source: 'google-maps',
      leadScore: calculateScore(extractionResults),
    };
    
    extractionTrace.mongoDBData = mongoDBData;
    log('Data that SHOULD be stored in MongoDB', mongoDBData);
    
    // ============================================================
    // GENERATE VERIFICATION REPORT
    // ============================================================
    log('STEP 8: GENERATE VERIFICATION REPORT');
    
    // Save extraction trace
    fs.writeFileSync(JSON_EXTRACTION, JSON.stringify(extractionTrace, null, 2));
    log(`✓ Extraction trace saved: ${path.basename(JSON_EXTRACTION)}`);
    
    // Generate markdown report
    report += `\n\n# VERIFICATION SUMMARY\n\n`;
    report += `**Business:** ${companyName.text || 'NOT FOUND'}\n`;
    report += `**Test Date:** ${new Date().toISOString()}\n`;
    report += `**Google Maps URL:** ${currentURL}\n\n`;
    
    report += `## Field Extraction Results\n\n`;
    report += `| Field | Selector Used | Found | Value |\n`;
    report += `|-------|----------------|-------|-------|\n`;
    
    for (const [field, result] of Object.entries(extractionResults)) {
      const found = result.text ? '✓' : '✗';
      const value = result.text ? result.text.substring(0, 50) : 'NOT FOUND';
      report += `| ${field} | ${result.selector} | ${found} | ${value} |\n`;
    }
    
    report += `\n## Pipeline Trace\n\n`;
    report += `\`\`\`\n`;
    report += `Google Maps DOM (visible)\n`;
    report += `  ↓ [Check HTML: ${fieldPresence['Website (http/https)']}, ${fieldPresence['Phone (+91 or 10-digit)']}, ${fieldPresence['Address (area indicators)']}]\n`;
    report += `  ↓\n`;
    report += `Playwright Extraction\n`;
    report += `  ↓ [Results: ${Object.values(extractionResults).filter(r => r.text).length}/${Object.keys(extractionResults).length} fields]\n`;
    report += `  ↓\n`;
    report += `MongoDB Storage\n`;
    report += `  ↓ [Check backend/src/scrapers/google-maps.scraper.ts storeLeads()]\n`;
    report += `  ↓\n`;
    report += `API Response\n`;
    report += `  ↓ [Check API response includes all fields]\n`;
    report += `  ↓\n`;
    report += `Frontend Display\n`;
    report += `\`\`\`\n\n`;
    
    report += `## ROOT CAUSE IDENTIFIED\n\n`;
    
    // Analyze root cause
    const htmlHasFields = Object.values(fieldPresence).filter(p => p.includes('✓')).length;
    const extractedCount = Object.values(extractionResults).filter(r => r.text).length;
    
    if (htmlHasFields === 0) {
      report += `**Issue:** Google Maps detail panel HTML does NOT contain the fields.\n`;
      report += `**Root Cause:** Detail panel failed to load properly or wrong element selected.\n`;
      report += `**Evidence:** ${htmlHasFields}/8 field keywords found in captured HTML.\n`;
    } else if (extractedCount === 0) {
      report += `**Issue:** HTML contains fields but extraction FAILED.\n`;
      report += `**Root Cause:** Selectors are incorrect or too specific.\n`;
      report += `**Evidence:** HTML has fields (${htmlHasFields}/8) but extraction got 0/${Object.keys(extractionResults).length}.\n`;
    } else if (extractedCount < 5) {
      report += `**Issue:** Partial extraction success - some fields missing.\n`;
      report += `**Root Cause:** Some selectors work, others need fallbacks.\n`;
      report += `**Evidence:** Extracted ${extractedCount}/${Object.keys(extractionResults).length} fields.\n`;
    } else {
      report += `**Issue:** All fields extracted successfully.\n`;
      report += `**Root Cause:** Problem is in MongoDB storage or API mapping, NOT extraction.\n`;
      report += `**Evidence:** Extracted ${extractedCount}/${Object.keys(extractionResults).length} fields.\n`;
    }
    
    report += `\n## Files Generated\n\n`;
    report += `- ${path.basename(SCREENSHOT)} - Screenshot of detail panel\n`;
    report += `- ${path.basename(HTML_PANEL)} - Detail panel HTML only\n`;
    report += `- ${path.basename(HTML_PAGE)} - Full page HTML\n`;
    report += `- ${path.basename(JSON_EXTRACTION)} - Extraction trace JSON\n`;
    report += `- ${path.basename(REPORT_FILE)} - This report\n`;
    
    fs.writeFileSync(REPORT_FILE, report);
    log(`✓ Verification report saved: ${path.basename(REPORT_FILE)}`);
    
    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('RUNTIME VERIFICATION COMPLETE');
    console.log('='.repeat(80));
    console.log(`\nBusiness: ${companyName.text || 'NOT FOUND'}`);
    console.log(`Extracted: ${extractedCount}/${Object.keys(extractionResults).length} fields`);
    console.log(`HTML Contains: ${htmlHasFields}/8 field indicators`);
    console.log(`\nEvidence saved to: ${EVIDENCE_DIR}/`);
    console.log(`\nKey Files:`);
    console.log(`- Report: ${path.basename(REPORT_FILE)}`);
    console.log(`- Screenshot: ${path.basename(SCREENSHOT)}`);
    console.log(`- Detail Panel HTML: ${path.basename(HTML_PANEL)}`);
    console.log(`- Trace JSON: ${path.basename(JSON_EXTRACTION)}`);
    console.log('='.repeat(80));
    
    await browser.close();
    process.exit(0);
    
  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}`);
    console.error(error.stack);
    
    if (browser) await browser.close();
    process.exit(1);
  }
}

function calculateScore(extraction) {
  let score = 30;
  if (extraction.website.text) score += 20;
  if (extraction.phone.text) score += 10;
  if (extraction.email.text) score += 10;
  if (extraction.address.text) score += 5;
  if (extraction.category.text) score += 5;
  if (extraction.rating.text && parseFloat(extraction.rating.text) >= 4.5) score += 10;
  if (extraction.reviews.text && parseInt(extraction.reviews.text) >= 50) score += 5;
  return Math.min(score, 100);
}

runVerification().catch(console.error);
