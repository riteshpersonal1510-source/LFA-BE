import { ScraperLead } from './types';

export class LeadNormalizer {
  normalize(lead: ScraperLead, context: {
    keyword: string;
    location: string;
    state?: string;
    city?: string;
    area?: string;
    businessType: string;
    source: string;
  }): ScraperLead {
    return {
      ...lead,
      companyName: this.normalizeName(lead.companyName),
      phone: this.normalizePhone(lead.phone),
      website: this.normalizeWebsite(lead.website),
      address: this.normalizeAddress(lead.address),
      source: context.source,
      state: context.state || lead.state,
      city: context.city || lead.city,
      area: context.area || lead.area,
      businessType: context.businessType || lead.businessType,
    };
  }

  normalizeName(name: string): string {
    if (!name) return '';
    let normalized = name.trim();
    normalized = normalized.replace(/\s+/g, ' ');
    normalized = normalized.replace(/[^\p{L}\p{N}\s&.,'-]/gu, '');
    const words = ['the', 'a', 'an', 'pvt', 'ltd', 'limited', 'private', 'llp', 'inc'];
    const wordRegex = new RegExp(`\\b(${words.join('|')})\\b`, 'giu');
    normalized = normalized.replace(wordRegex, (match) => match.toLowerCase());
    return normalized;
  }

  normalizePhone(phone?: string): string | undefined {
    if (!phone) return undefined;
    let cleaned = phone.replace(/[\s\-().]/g, '');
    if (cleaned.startsWith('+')) {
      const digits = cleaned.slice(1).replace(/[^\d]/g, '');
      return digits.length >= 8 ? `+${digits}` : undefined;
    }
    const digits = cleaned.replace(/[^\d]/g, '');
    if (digits.length >= 10) return digits;
    return undefined;
  }

  normalizeWebsite(website?: string): string | undefined {
    if (!website) return undefined;
    let normalized = website.trim();
    try {
      const parsed = new URL(normalized.startsWith('http') ? normalized : `https://${normalized}`);
      parsed.hash = '';
      return parsed.toString().replace(/\/$/, '');
    } catch {
      return undefined;
    }
  }

  normalizeAddress(address?: string): string | undefined {
    if (!address) return undefined;
    let normalized = address.trim();
    normalized = normalized.replace(/\s+/g, ' ');
    return normalized;
  }

  getDedupKey(lead: ScraperLead): string[] {
    const keys: string[] = [];
    if (lead.placeId) {
      keys.push(`placeId:${lead.placeId}`);
    }
    if (lead.sourceUrl) {
      keys.push(`sourceUrl:${lead.sourceUrl}`);
    }
    if (lead.href && lead.href !== lead.sourceUrl) {
      keys.push(`sourceUrl:${lead.href}`);
    }
    if (lead.latitude !== undefined && lead.longitude !== undefined) {
      keys.push(`coords:${lead.latitude.toFixed(5)},${lead.longitude.toFixed(5)}`);
    }
    if (lead.phone && lead.phone.length >= 8) {
      keys.push(`phone:${lead.phone}`);
    }
    if (lead.website) {
      keys.push(`website:${lead.website}`);
    }
    if (lead.companyName) {
      const name = lead.companyName.toLowerCase().replace(/\s+/g, '');
      const address = (lead.address || '').toLowerCase().replace(/\s+/g, '');
      if (address) {
        keys.push(`nameaddr:${name}|${address}`);
      } else {
        const city = (lead.city || '').toLowerCase().replace(/\s+/g, '');
        keys.push(`name:${name}|${city}`);
      }
    }
    return keys;
  }
}

export const leadNormalizer = new LeadNormalizer();
