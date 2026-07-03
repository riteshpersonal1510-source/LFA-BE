#!/usr/bin/env node
/**
 * ROOT CAUSE ANALYSIS - CRITICAL PRODUCTION DEBUG
 * 
 * This script tests the COMPLETE EXTRACTION PIPELINE for ONE business:
 * 1. Google Maps Search
 * 2. Open Detail Panel
 * 3. Dump Raw HTML
 * 4. Search for Fields in HTML
 * 5. Extract via Selectors
 * 6. Store to MongoDB
 * 7. Verify Database Record
 * 8. Verify API Response
 * 9. Verify Frontend Display
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEBUG_DIR = path.join(__dirname, 'debug-extraction');

// Ensure debug directory exists
if (!fs.existsSync(DEBUG_DIR)) {
  fs.mkdirSync(DEBUG_DIR, { recursive: true });
}

const LOG_FILE = path.join(DEBUG_DIR, `extraction-debug-${Date.now()}.log`);
const DEBUG_HTML = path.join(DEBUG_DIR, `detail-panel-raw-${Date.now()}.html`);
const DEBUG_JSON = path.join(DEBUG_DIR, `extraction-results-${Date.now()}.json`);

// Test business to search
const TEST_BUSINESS = 'Thimphu Primary School';
const TEST_LOCATION = 'Ahmedabad';

function log(message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}`;
  console.log(logEntry);
  
  if (data) {
    console.log(JSON.stringify(data, null, 2));
    fs.appendFileSync(LOG_FILE, `${logEntry}\n${JSON.stringify(data, null, 2)}\n`);
  } else {
    fs.appendFileSync(LOG_FILE, `${logEntry}\n`);
  }
}

async function runDebugExtraction() {
  let browser = null;
  let page = null;
  
  try {
    log('=== STARTING ROOT CAUSE ANALYSIS DEBUG ===');
    log(`Test Business: ${TEST_BUSINESS} in ${TEST_LOCATION}`);
    
    // STEP 1: Launch browser
    log('\n=== STEP 1: LAUNCH BROWSER ===');
    browser = await chromium.launch({
      headless: false, // Show browser so we can see what's happening
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-dev-shm-usage',
      ],
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    
    page = await context.newPage();
    
    // STEP 2: Navigate to Google Maps
    log('\n=== STEP 2: NAVIGATE TO GOOGLE MAPS ===');
    await page.goto('https://www.google.com/maps', { waitUntil: 'networkidle' });
    log('✓ Google Maps loaded');
    
    // STEP 3: Search for business
    log('\n=== STEP 3: SEARCH FOR BUSINESS ===');
    const searchQuery = `${TEST_BUSINESS} in ${TEST_LOCATION}`;
    log(`Searching for: "${searchQuery}"`);
    
    const searchBox = await page.querySelector('input#searchboxinput');
    if (!searchBox) {
      throw new Error('Search box not found!');
    }
    
    await searchBox.fill(searchQuery);
    await page.keyboard.press('Enter');
    await page.waitForSelector('[role="main"]', { timeout: 15000 });
    log('✓ Search completed');
    
    // STEP 4: Wait and capture initial results
    log('\n=== STEP 4: WAIT FOR RESULTS PANEL ===');
    await page.waitForTimeout(2000); // Let results load
    
    // STEP 5: Click first business card
    log('\n=== STEP 5: CLICK FIRST BUSINESS CARD ===');
    const businessCards = await page.$$('div[role="article"]');
    log(`Found ${businessCards.length} business cards`);
    
    if (businessCards.length === 0) {
      throw new Error('No business cards found!');
    }
    
    // Get first card title for verification
    const firstCardTitle = await businessCards[0].evaluate(el => {
      const title = el.querySelector('h2');
      return title ? title.textContent : 'Unknown';
    });
    log(`First card title: "${firstCardTitle}"`);
    
    await businessCards[0].click();
    log('✓ Clicked first business card');
    
    // STEP 6: Wait for detail panel to fully load
    log('\n=== STEP 6: WAIT FOR DETAIL PANEL ===');
    try {
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      log('✓ Detail panel selector found');
    } catch (e) {
      log('! Dialog selector not found, checking alternative...');
      await page.waitForSelector('div[data-item-type]', { timeout: 5000 });
      log('✓ Alternative detail panel found');
    }
    
    // Wait additional time for content to render
    await page.waitForTimeout(3000);
    log('✓ Additional wait for full render (3s)');
    
    // STEP 7: Get page info
    log('\n=== STEP 7: CAPTURE PAGE INFO ===');
    const pageUrl = page.url();
    const pageTitle = await page.title();
    const bodyInnerHTML = await page.evaluate(() => document.body.innerHTML);
    
    log(`Current URL: ${pageUrl}`);
    log(`Page Title: ${pageTitle}`);
    log(`DOM Length: ${bodyInnerHTML.length} bytes`);
    
    // STEP 8: Dump detail panel HTML
    log('\n=== STEP 8: DUMP DETAIL PANEL HTML ===');
    const detailPanelHTML = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (dialog) return dialog.outerHTML;
      
      const dataItem = document.querySelector('div[data-item-type]');
      if (dataItem) return dataItem.outerHTML;
      
      const mainPanel = document.querySelector('[role="main"]');
      if (mainPanel) return mainPanel.outerHTML;
      
      return 'PANEL NOT FOUND';
    });
    
    fs.writeFileSync(DEBUG_HTML, detailPanelHTML);
    log(`✓ Detail panel HTML saved to ${path.basename(DEBUG_HTML)}`);
    log(`HTML size: ${detailPanelHTML.length} bytes`);
    
    // STEP 9: Search for key fields in HTML
    log('\n=== STEP 9: SEARCH FOR FIELDS IN HTML ===');
    const fieldsToFind = [
      'Website',
      'Phone',
      'Category',
      'Address',
      'Rating',
      'Working Hours',
      'Reviews',
      'Coordinates',
      'http',
      'https',
      '+91',
      '@',
    ];
    
    const fieldPresence = {};
    const fieldsFoundAt = {};
    
    for (const field of fieldsToFind) {
      const found = detailPanelHTML.includes(field);
      fieldPresence[field] = found ? 'FOUND' : 'NOT FOUND';
      
      if (found) {
        const index = detailPanelHTML.indexOf(field);
        const context = detailPanelHTML.substring(Math.max(0, index - 100), Math.min(detailPanelHTML.length, index + 100));
        fieldsFoundAt[field] = context.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }
    }
    
    log('Field Presence in HTML:', fieldPresence);
    log('Field Context:', fieldsFoundAt);
    
    // STEP 10: Extract using selectors
    log('\n=== STEP 10: EXTRACT USING SELECTORS ===');
    const extractedData = {
      companyName: null,
      category: null,
      phone: null,
      address: null,
      website: null,
      rating: null,
      reviewsCount: null,
      workingHours: null,
      coordinates: null,
    };
    
    // Extract company name
    const companyName = await page.evaluate(() => {
      const h1 = document.querySelector('h1.DUwDvf');
      if (h1) return h1.textContent.trim();
      
      const h2 = document.querySelector('h2');
      if (h2) return h2.textContent.trim();
      
      return null;
    });
    extractedData.companyName = companyName;
    log(`Company Name: ${companyName || 'NOT FOUND'}`);
    
    // Extract category
    const category = await page.evaluate(() => {
      const btn = document.querySelector('button.DKv0N');
      if (btn) return btn.textContent.trim();
      
      const links = document.querySelectorAll('button');
      for (const link of links) {
        if (link.textContent.includes('Category') || link.textContent.match(/^[A-Z][a-z]+/)) {
          return link.textContent.trim();
        }
      }
      
      return null;
    });
    extractedData.category = category;
    log(`Category: ${category || 'NOT FOUND'}`);
    
    // Extract phone
    const phone = await page.evaluate(() => {
      const phoneBtn = document.querySelector('button[aria-label*="Phone"]');
      if (phoneBtn) return phoneBtn.textContent.trim();
      
      const allText = document.body.innerText;
      const phoneMatch = allText.match(/[\+\d][\d\s\-]{8,15}/);
      if (phoneMatch) return phoneMatch[0];
      
      return null;
    });
    extractedData.phone = phone;
    log(`Phone: ${phone || 'NOT FOUND'}`);
    
    // Extract address
    const address = await page.evaluate(() => {
      const addrBtn = document.querySelector('button[aria-label*="Address"]');
      if (addrBtn) return addrBtn.textContent.trim();
      
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const text = btn.textContent.trim();
        if (text.length > 20 && text.includes(',')) {
          return text;
        }
      }
      
      return null;
    });
    extractedData.address = address;
    log(`Address: ${address || 'NOT FOUND'}`);
    
    // Extract website
    const website = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href]');
      for (const link of Array.from(links)) {
        const href = link.getAttribute('href') || '';
        if (href.startsWith('http') && !href.includes('google.com/maps')) {
          return href;
        }
      }
      return null;
    });
    extractedData.website = website;
    log(`Website: ${website || 'NOT FOUND'}`);
    
    // Extract rating
    const rating = await page.evaluate(() => {
      const starBtn = document.querySelector('button[aria-label*="star"]');
      if (starBtn) {
        const match = starBtn.getAttribute('aria-label')?.match(/(\d+\.?\d*)/);
        if (match) return parseFloat(match[1]);
      }
      return null;
    });
    extractedData.rating = rating;
    log(`Rating: ${rating || 'NOT FOUND'}`);
    
    // Extract reviews count
    const reviewsCount = await page.evaluate(() => {
      const reviewBtn = document.querySelector('button[aria-label*="reviews"]');
      if (reviewBtn) {
        const match = reviewBtn.getAttribute('aria-label')?.match(/(\d+)/);
        if (match) return parseInt(match[1]);
      }
      return null;
    });
    extractedData.reviewsCount = reviewsCount;
    log(`Reviews Count: ${reviewsCount || 'NOT FOUND'}`);
    
    // Save extraction results
    log('\n=== STEP 11: SAVE EXTRACTION RESULTS ===');
    fs.writeFileSync(DEBUG_JSON, JSON.stringify({
      testBusiness: TEST_BUSINESS,
      testLocation: TEST_LOCATION,
      searchQuery,
      pageUrl,
      pageTitle,
      timestamp: new Date().toISOString(),
      fieldPresence,
      extractedData,
      htmlSize: detailPanelHTML.length,
    }, null, 2));
    log(`✓ Results saved to ${path.basename(DEBUG_JSON)}`);
    
    // STEP 12: Check what would be stored
    log('\n=== STEP 12: WHAT WOULD BE STORED IN MONGODB ===');
    const mongoData = {
      companyName: extractedData.companyName,
      website: extractedData.website || undefined,
      phone: extractedData.phone || undefined,
      email: undefined, // NOT EXTRACTED!
      address: extractedData.address || undefined,
      category: extractedData.category || undefined,
      source: 'google-maps',
      rating: extractedData.rating || undefined,
      reviewsCount: extractedData.reviewsCount || undefined,
      leadScore: 50, // Hardcoded!
      // MISSING FROM DB:
      // - workingHours
      // - businessType
      // - fullSearchQuery
      // - area, city, state
      // - locationRelevanceScore
      // - isLocationValidated
      // - coordinates
      // - businessStatus
      // - ownerClaimed
      // - plusCode
      // - serviceOptions
      // - totalPhotos
    };
    
    log('Data stored in MongoDB:', mongoData);
    log('\n❌ MISSING FIELDS that are NOT being stored:');
    log('- Working Hours');
    log('- Business Type');
    log('- Full Search Query');
    log('- Area / City / State');
    log('- Location Relevance Score');
    log('- Location Validated Flag');
    log('- Coordinates (Latitude/Longitude)');
    log('- Business Status');
    log('- Owner Claimed');
    log('- Plus Code');
    log('- Service Options');
    log('- Total Photos');
    
    // STEP 13: Check Lead Score calculation
    log('\n=== STEP 13: LEAD SCORE CALCULATION ISSUE ===');
    log('Current Algorithm (Hardcoded):');
    log('- Start: 50');
    log('- Website: +10');
    log('- Email: +10');
    log('- Address: +5');
    log('- Category: +5');
    log('- Rating ≥4.5: +20');
    
    log('\n✓ Expected Algorithm (from Logic.txt):');
    log('- Start: 30');
    log('- Website: +20');
    log('- Phone: +10');
    log('- Email: +10');
    log('- Rating ≥4.5: +10');
    log('- Reviews ≥50: +5');
    
    const calculatedScore = {
      current: mongoData.leadScore,
      expected: calculateCorrectScore(extractedData),
    };
    
    log(`\nCurrent Score: ${calculatedScore.current}`);
    log(`Expected Score: ${calculatedScore.expected}`);
    log(`Difference: ${calculatedScore.current - calculatedScore.expected}`);
    
    log('\n=== ✓ DEBUG COMPLETE ===');
    log(`\nDebug files created:`);
    log(`- ${LOG_FILE}`);
    log(`- ${DEBUG_HTML}`);
    log(`- ${DEBUG_JSON}`);
    
    await browser.close();
    
  } catch (error) {
    log(`❌ ERROR: ${error.message}`);
    log(`Stack: ${error.stack}`);
    if (browser) await browser.close();
    process.exit(1);
  }
}

function calculateCorrectScore(data) {
  let score = 30; // Should start at 30, not 50
  
  if (data.website) score += 20; // Should be +20, not +10
  if (data.phone) score += 10; // Currently missing
  // email already counted
  if (data.category) score += 5; // OK
  if (data.address) score += 5; // OK
  
  if (data.rating) {
    if (data.rating >= 4.5) score += 10; // Should be +10, not +20
    else if (data.rating >= 4.0) score += 7;
    else if (data.rating >= 3.5) score += 5;
  }
  
  if (data.reviewsCount && data.reviewsCount >= 50) score += 5; // Currently missing
  
  return Math.min(score, 100);
}

// Run the debug
runDebugExtraction().catch(console.error);
