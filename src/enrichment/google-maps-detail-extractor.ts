import { logger } from '../utils/logger';
import axios from 'axios';

export interface GoogleMapsDetailData {
  companyName: string;
  website?: string;
  phone?: string;
  phones?: string[];
  email?: string;
  address?: string;
  streetAddress?: string;
  postalCode?: string;
  pincode?: string;
  area?: string;
  city?: string;
  state?: string;
  country?: string;
  category?: string;
  secondaryCategories?: string[];
  rating?: number;
  reviewsCount?: number;
  totalPhotos?: number;
  workingHours?: string;
  businessStatus?: string;
  serviceOptions?: string[];
  ownerClaimed?: boolean;
  plusCode?: string;
  placeId?: string;
  sourceUrl?: string;
  latitude?: number;
  longitude?: number;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
    twitter?: string;
    whatsapp?: string;
  };
  extractedAt: string;
}

interface AIScrapeResult {
  success: boolean;
  leads?: any[];
  error?: string;
}

export class GoogleMapsDetailExtractor {
  private readonly AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'https://lfa-ai.onrender.com';
  private readonly AI_TIMEOUT = 60000; // 60 seconds for AI service calls

  async extractDetail(placeId: string, sourceUrl?: string): Promise<GoogleMapsDetailData | null> {
    try {
      // Try AI service first (new enhanced scraper)
      const aiResult = await this.extractViaAIService(placeId, sourceUrl);
      if (aiResult) {
        logger.info({ placeId }, 'GoogleMapsDetail: Successfully extracted via AI service');
        return aiResult;
      }
      
      // Fallback to legacy browser automation if AI service fails
      logger.warn({ placeId }, 'GoogleMapsDetail: AI service failed, falling back to legacy extraction');
      return await this.extractViaLegacyBrowser(placeId, sourceUrl);
      
    } catch (err) {
      logger.error({ placeId, err: err instanceof Error ? err.message : String(err) }, 'GoogleMapsDetail: All extraction methods failed');
      return null;
    }
  }

  private async extractViaAIService(placeId: string, sourceUrl?: string): Promise<GoogleMapsDetailData | null> {
    try {
      // If we have a sourceUrl, we can try a direct single-business scrape
      if (sourceUrl && sourceUrl.includes('google.com/maps')) {
        // Extract company name from URL for a more targeted search
        let companyName = '';
        try {
          const urlMatch = sourceUrl.match(/maps\/place\/([^/]+)/);
          if (urlMatch) {
            companyName = decodeURIComponent(urlMatch[1]).replace(/\+/g, ' ');
          }
        } catch {}

        if (!companyName) {
          logger.warn({ placeId, sourceUrl }, 'Could not extract company name from sourceUrl for AI service');
          return null;
        }

        // Use a targeted search with the company name
        const searchPayload = {
          keyword: companyName,
          location: '', // Let the AI service extract location from the specific business page
          sources: ['google-maps'],
          maxResults: 3, // Get a few results to find the exact match
        };

        const response = await axios.post(`${this.AI_SERVICE_URL}/api/v1/scrape`, searchPayload, {
          timeout: this.AI_TIMEOUT,
          headers: {
            'Content-Type': 'application/json',
          }
        });

        const result: AIScrapeResult = response.data;
        
        if (!result.success || !result.leads || result.leads.length === 0) {
          logger.warn({ placeId, companyName, result }, 'GoogleMapsDetail: AI service returned no results');
          return null;
        }

        // Find the best match by comparing placeId or sourceUrl
        let bestMatch = result.leads[0];
        
        if (placeId) {
          const exactMatch = result.leads.find(lead => lead.placeId === placeId);
          if (exactMatch) bestMatch = exactMatch;
        }
        
        if (sourceUrl) {
          const urlMatch = result.leads.find(lead => 
            lead.sourceUrl && lead.sourceUrl.includes(placeId || companyName)
          );
          if (urlMatch) bestMatch = urlMatch;
        }

        const lead = bestMatch;
        
        // Map AI service response to our GoogleMapsDetailData interface
        const data: GoogleMapsDetailData = {
          companyName: lead.companyName || companyName,
          website: lead.website || undefined,
          phone: lead.phone || undefined,
          email: lead.email || undefined,
          address: lead.address || undefined,
          streetAddress: lead.streetAddress || lead.address || undefined,
          postalCode: lead.postalCode || lead.pincode || undefined,
          pincode: lead.pincode || lead.postalCode || undefined,
          area: lead.area || undefined,
          city: lead.city || undefined,
          state: lead.state || undefined,
          country: lead.country || undefined,
          category: lead.category || undefined,
          secondaryCategories: lead.secondaryCategories || undefined,
          rating: lead.rating || undefined,
          reviewsCount: lead.reviewsCount || undefined,
          totalPhotos: lead.totalPhotos || undefined,
          workingHours: lead.workingHours || undefined,
          businessStatus: lead.businessStatus || undefined,
          serviceOptions: lead.serviceOptions || undefined,
          ownerClaimed: lead.ownerClaimed || undefined,
          plusCode: lead.plusCode || undefined,
          placeId: lead.placeId || placeId,
          sourceUrl: lead.sourceUrl || sourceUrl || undefined,
          latitude: lead.latitude || undefined,
          longitude: lead.longitude || undefined,
          socialLinks: lead.socialLinks || undefined,
          extractedAt: new Date().toISOString(),
        };

        // Ensure we have some meaningful data
        if (!data.companyName && !data.phone && !data.address && !data.website) {
          logger.warn({ placeId, data }, 'GoogleMapsDetail: AI service returned insufficient data');
          return null;
        }

        logger.info({ 
          placeId, 
          companyName: data.companyName,
          hasPhone: !!data.phone,
          hasAddress: !!data.address,
          hasWebsite: !!data.website,
          hasRating: !!data.rating
        }, 'GoogleMapsDetail: AI service extraction successful');

        return data;
      }

      // No valid sourceUrl, cannot use AI service effectively
      logger.warn({ placeId, sourceUrl }, 'GoogleMapsDetail: No valid sourceUrl for AI service extraction');
      return null;

    } catch (err) {
      if (axios.isAxiosError(err)) {
        logger.error({ 
          placeId, 
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data 
        }, 'GoogleMapsDetail: AI service HTTP error');
      } else {
        logger.error({ placeId, err: err instanceof Error ? err.message : String(err) }, 'GoogleMapsDetail: AI service request failed');
      }
      return null;
    }
  }

  private async extractViaLegacyBrowser(placeId: string, sourceUrl?: string): Promise<GoogleMapsDetailData | null> {
    // Import legacy browser manager only if needed
    const { browserManager } = await import('../core/scraper-engine/browser-manager');
    
    const url = sourceUrl || this.buildPlaceUrl(placeId);
    if (!url) return null;

    let page: any = null;
    try {
      const acquired = await browserManager.acquire('gm-detail');
      page = acquired.page;

      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      await page.waitForTimeout(3000);

      const panelLoaded = await this.waitForDetailPanel(page);
      if (!panelLoaded) {
        logger.warn({ placeId, url }, 'GoogleMapsDetail: Detail panel did not load');
        return null;
      }

      await page.waitForTimeout(1500);

      const data = await this.extractAllFieldsLegacy(page, placeId);
      data.extractedAt = new Date().toISOString();
      return data;
    } catch (err) {
      logger.error({ placeId, url, err: err instanceof Error ? err.message : String(err) }, 'GoogleMapsDetail: Legacy extraction failed');
      return null;
    } finally {
      if (page) {
        await browserManager.release(page, 'gm-detail').catch(() => {});
      }
    }
  }

  private buildPlaceUrl(placeId: string): string {
    return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`;
  }

  private async waitForDetailPanel(page: any): Promise<boolean> {
    try {
      await page.waitForSelector('div[role="main"]', { timeout: 15000 });
      return true;
    } catch {
      try {
        await page.waitForSelector('h1', { timeout: 5000 });
        return true;
      } catch {
        return false;
      }
    }
  }

  private async extractAllFieldsLegacy(page: any, placeId: string): Promise<GoogleMapsDetailData> {
    const data: GoogleMapsDetailData = {
      companyName: '',
      placeId,
      extractedAt: '',
    };

    try {
      data.companyName = await this.extractText(page, 'h1') || '';
    } catch { }

    try {
      data.rating = await page.evaluate(() => {
        const text = document.body.innerText;
        const match = text.match(/([\d.]+)\s*\([\d,]+/);
        if (match) return parseFloat(match[1]);
        const ariaLabel = document.querySelector('[aria-label*="stars"]')?.getAttribute('aria-label');
        if (ariaLabel) {
          const m = ariaLabel.match(/[\d.]+/);
          if (m) return parseFloat(m[0]);
        }
        return undefined;
      });
    } catch { }

    try {
      data.reviewsCount = await page.evaluate(() => {
        const text = document.body.innerText;
        const match = text.match(/([\d,]+)\s*reviews?/i);
        if (match) return parseInt(match[1].replace(/,/g, ''), 10);
        return undefined;
      });
    } catch { }

    try {
      data.website = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href]'));
        for (const link of links) {
          const href = (link as HTMLAnchorElement).href || '';
          if (href && /^https?:\/\//.test(href) && !href.includes('google.com/maps')) {
            return href;
          }
        }
        return undefined;
      });
    } catch { }

    try {
      data.phone = await page.evaluate(() => {
        const telLinks = Array.from(document.querySelectorAll('a[href^="tel:"]'));
        if (telLinks.length > 0) {
          const href = (telLinks[0] as HTMLAnchorElement).href;
          return decodeURIComponent(href.replace('tel:', ''));
        }
        const buttons = Array.from(document.querySelectorAll('button'));
        for (const btn of buttons) {
          const tooltip = btn.getAttribute('data-tooltip') || '';
          const phoneMatch = tooltip.match(/[\+\d\s\-\(\)]{7,}/);
          if (phoneMatch) return phoneMatch[0].trim();
        }
        return undefined;
      });
    } catch { }

    try {
      data.address = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="maps.google.com"]'));
        for (const link of links) {
          const text = (link as HTMLElement).innerText?.trim();
          if (text && text.length > 10) return text;
        }
        const buttons = Array.from(document.querySelectorAll('button[data-tooltip]'));
        for (const btn of buttons) {
          const tooltip = btn.getAttribute('data-tooltip') || '';
          if (tooltip && tooltip.length > 15 && !tooltip.includes('phone') && !tooltip.includes('website')) {
            return tooltip;
          }
        }
        return undefined;
      });
    } catch { }

    try {
      data.category = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="/maps/search/"]'));
        for (const link of links) {
          const text = (link as HTMLElement).innerText?.trim();
          if (text && text.length > 2 && text.length < 60) return text;
        }
        return undefined;
      });
    } catch { }

    try {
      data.businessStatus = await page.evaluate(() => {
        const spans = Array.from(document.querySelectorAll('span'));
        for (const span of spans) {
          const text = (span as HTMLElement).innerText?.trim().toLowerCase();
          if (text === 'open' || text?.includes('temporarily closed') || text?.includes('permanently closed')) {
            return (span as HTMLElement).innerText?.trim();
          }
        }
        return undefined;
      });
    } catch { }

    try {
      data.workingHours = await page.evaluate(() => {
        const tables = Array.from(document.querySelectorAll('table'));
        for (const table of tables) {
          const rows = table.querySelectorAll('tr');
          const hours: string[] = [];
          for (let i = 0; i < rows.length; i++) {
            const cells = rows[i].querySelectorAll('td');
            if (cells.length >= 2) {
              const day = cells[0].innerText?.trim();
              const time = cells[1].innerText?.trim();
              if (day && time && day.length < 10) {
                hours.push(`${day}: ${time}`);
              }
            }
          }
          if (hours.length > 0) return hours.join('\n');
        }
        return undefined;
      });
    } catch { }

    try {
      data.plusCode = await page.evaluate(() => {
        const text = document.body.innerText;
        const match = text.match(/([A-Z0-9]{4}\+[A-Z0-9]{2,4})/);
        return match ? match[1] : undefined;
      });
    } catch { }

    try {
      const coords = await page.evaluate(() => {
        const url = window.location.href;
        const match = url.match(/@(-?[\d.]+),(-?[\d.]+)/);
        if (match) {
          return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
        }
        return null;
      });
      if (coords) {
        data.latitude = coords.lat;
        data.longitude = coords.lng;
      }
    } catch { }

    try {
      data.totalPhotos = await page.evaluate(() => {
        const text = document.body.innerText;
        const match = text.match(/([\d,]+)\s*photos?/i);
        if (match) return parseInt(match[1].replace(/,/g, ''), 10);
        return undefined;
      });
    } catch { }

    try {
      data.ownerClaimed = await page.evaluate(() => {
        const text = document.body.innerText;
        return text.includes('Claim this business') ? false : text.includes('Own this business') ? true : undefined;
      });
    } catch { }

    try {
      data.serviceOptions = await page.evaluate(() => {
        const options: string[] = [];
        const knownOptions = ['online appointments', 'online estimates', 'in-store shopping', 'delivery', 'takeout', 'dine-in', 'curbside pickup', 'no-contact delivery'];
        const spans = Array.from(document.querySelectorAll('span'));
        for (const span of spans) {
          const text = (span as HTMLElement).innerText?.trim().toLowerCase();
          if (text && knownOptions.includes(text)) {
            options.push((span as HTMLElement).innerText?.trim() || text);
          }
        }
        return options.length > 0 ? options : undefined;
      });
    } catch { }

    try {
      data.sourceUrl = await page.evaluate(() => window.location.href);
    } catch { }

    return data;
  }

  private async extractText(page: any, selector: string): Promise<string | undefined> {
    try {
      return await page.evaluate((sel: string) => {
        const el = document.querySelector(sel);
        return el ? (el as HTMLElement).innerText?.trim() || undefined : undefined;
      }, selector);
    } catch {
      return undefined;
    }
  }
}
