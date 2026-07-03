import { Lead, ILead } from '../models/Lead';
import { logger } from '../utils/logger';
import { GoogleMapsDetailExtractor } from './google-maps-detail-extractor';
import type { GoogleMapsDetailData } from './google-maps-detail-extractor';
import { WebsiteEnrichmentService } from './website-enrichment.service';
import type { WebsiteEnrichmentResult } from './website-enrichment.service';
import { websiteCache } from './website-cache.service';

const googleMapsDetailExtractor = new GoogleMapsDetailExtractor();
const websiteEnrichmentService = new WebsiteEnrichmentService();

export interface EnrichmentResult {
  leadId: string;
  success: boolean;
  googleMapsData?: GoogleMapsDetailData;
  websiteData?: WebsiteEnrichmentResult;
  fieldsUpdated: string[];
  errors: string[];
  durationMs: number;
}

interface QueueEntry {
  leadId: string;
  priority: number;
}

export class LeadEnrichmentOrchestrator {
  private queue: QueueEntry[] = [];
  private processing = new Set<string>();
  private maxConcurrent = 5;
  private running = false;

  enqueue(leadId: string, priority = 0): void {
    if (this.processing.has(leadId)) return;
    const exists = this.queue.some(e => e.leadId === leadId);
    if (exists) return;
    this.queue.push({ leadId, priority });
    this.queue.sort((a, b) => b.priority - a.priority);
    if (!this.running) this.processQueue();
  }

  enqueueMultiple(leadIds: string[], priority = 0): void {
    for (const leadId of leadIds) {
      this.enqueue(leadId, priority);
    }
  }

  get queueSize(): number {
    return this.queue.length;
  }

  get activeCount(): number {
    return this.processing.size;
  }

  get status(): { queueSize: number; activeCount: number; maxConcurrent: number; cacheSize: number } {
    return {
      queueSize: this.queue.length,
      activeCount: this.processing.size,
      maxConcurrent: this.maxConcurrent,
      cacheSize: websiteCache.size,
    };
  }

  private async processQueue(): Promise<void> {
    this.running = true;
    while (this.queue.length > 0 && this.processing.size < this.maxConcurrent) {
      const entry = this.queue.shift();
      if (!entry) break;
      if (this.processing.has(entry.leadId)) continue;
      this.processing.add(entry.leadId);
      this.runEnrichment(entry.leadId).finally(() => {
        this.processing.delete(entry.leadId);
        if (this.queue.length > 0) setImmediate(() => this.processQueue());
        else this.running = false;
      });
    }
  }

  async enrichLead(leadId: string): Promise<EnrichmentResult> {
    return this.runEnrichment(leadId);
  }

  private async runEnrichment(leadId: string): Promise<EnrichmentResult> {
    const startTime = Date.now();
    const result: EnrichmentResult = {
      leadId,
      success: false,
      fieldsUpdated: [],
      errors: [],
      durationMs: 0,
    };

    try {
      const lead = await Lead.findById(leadId) as ILead | null;
      if (!lead) {
        result.errors.push('Lead not found');
        result.durationMs = Date.now() - startTime;
        return result;
      }

      await Lead.findByIdAndUpdate(leadId, {
        $set: {
          enrichmentStatus: 'running',
          enrichmentStartedAt: new Date(),
          enrichmentError: null,
          enrichmentProgress: 10,
          enrichmentCurrentStep: 'Google Maps detail extraction',
        },
      });

      if (lead.placeId || lead.sourceUrl) {
        try {
          const detailData = await googleMapsDetailExtractor.extractDetail(
            lead.placeId || '',
            lead.sourceUrl
          );
          if (detailData) {
            result.googleMapsData = detailData;
            const updates = this.buildGoogleMapsUpdates(lead, detailData);
            if (Object.keys(updates).length > 0) {
              await Lead.findByIdAndUpdate(leadId, { $set: updates });
              result.fieldsUpdated.push(...Object.keys(updates));
            }
          }
        } catch (err) {
          result.errors.push(`Google Maps detail: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      await Lead.findByIdAndUpdate(leadId, {
        $set: { enrichmentProgress: 40, enrichmentCurrentStep: 'Website analysis' },
      });

      const refreshedLead = await Lead.findById(leadId) as ILead | null;
      const website = refreshedLead?.website || lead.website;

      if (website) {
        try {
          const domain = website.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
          const websiteData = await websiteEnrichmentService.enrichWebsite(domain);
          result.websiteData = websiteData;

          if (websiteData.success) {
            const updates = this.buildWebsiteUpdates(lead, websiteData);
            if (Object.keys(updates).length > 0) {
              await Lead.findByIdAndUpdate(leadId, { $set: updates });
              result.fieldsUpdated.push(...Object.keys(updates));
            }
          }
        } catch (err) {
          result.errors.push(`Website enrichment: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      await Lead.findByIdAndUpdate(leadId, {
        $set: {
          enrichmentProgress: 70,
          enrichmentCurrentStep: 'Merging enrichment data',
        },
      });

      const mergedUpdates = this.mergeEnrichmentData(result);
      if (Object.keys(mergedUpdates).length > 0) {
        await Lead.findByIdAndUpdate(leadId, { $set: mergedUpdates });
        result.fieldsUpdated.push(...Object.keys(mergedUpdates));
      }

      await Lead.findByIdAndUpdate(leadId, {
        $set: {
          enrichmentStatus: 'completed',
          enrichmentCompletedAt: new Date(),
          enrichmentProgress: 100,
          enrichmentCurrentStep: 'Completed',
        },
      });

      result.success = true;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Fatal: ${errMsg}`);
      logger.error({ leadId, err: errMsg }, 'LeadEnrichmentOrchestrator: Fatal error');

      try {
        await Lead.findByIdAndUpdate(leadId, {
          $set: {
            enrichmentStatus: 'failed',
            enrichmentCompletedAt: new Date(),
            enrichmentError: errMsg,
            enrichmentProgress: Math.min(
              result.fieldsUpdated.length > 0 ? 80 : 20,
              100
            ),
          },
        });
      } catch { }
    }

    result.durationMs = Date.now() - startTime;
    logger.info({
      leadId,
      success: result.success,
      fieldsUpdated: result.fieldsUpdated.length,
      errors: result.errors.length,
      durationMs: result.durationMs,
    }, 'LeadEnrichmentOrchestrator: Completed');

    return result;
  }

  private buildGoogleMapsUpdates(lead: ILead, detailData: GoogleMapsDetailData): Record<string, unknown> {
    const updates: Record<string, unknown> = {};

    if (detailData.website && !lead.website) updates.website = detailData.website;
    if (detailData.phone && !lead.phone) updates.phone = detailData.phone;
    if (detailData.address && !lead.address) {
      updates.address = detailData.address;
      updates.streetAddress = detailData.streetAddress || detailData.address;
    }
    if (detailData.category && !lead.category) updates.category = detailData.category;
    if (detailData.rating !== undefined && (lead.rating === undefined || lead.rating === 0)) updates.rating = detailData.rating;
    if (detailData.reviewsCount !== undefined && (lead.reviewsCount === undefined || lead.reviewsCount === 0)) updates.reviewsCount = detailData.reviewsCount;
    if (detailData.businessStatus && !lead.businessStatus) updates.businessStatus = detailData.businessStatus;
    if (detailData.workingHours && !lead.workingHours) updates.workingHours = detailData.workingHours;
    if (detailData.plusCode && !lead.plusCode) updates.plusCode = detailData.plusCode;
    if (detailData.totalPhotos !== undefined && (lead.totalPhotos === undefined || lead.totalPhotos === 0)) updates.totalPhotos = detailData.totalPhotos;
    if (detailData.ownerClaimed !== undefined && lead.ownerClaimed === undefined) updates.ownerClaimed = detailData.ownerClaimed;
    if (detailData.latitude !== undefined && detailData.longitude !== undefined && (lead.latitude === undefined || lead.longitude === undefined)) {
      updates.latitude = detailData.latitude;
      updates.longitude = detailData.longitude;
    }
    if (detailData.sourceUrl && !lead.sourceUrl) updates.sourceUrl = detailData.sourceUrl;

    if (detailData.socialLinks) {
      const social: Record<string, string | undefined> = {};
      for (const [key, val] of Object.entries(detailData.socialLinks)) {
        if (val) social[key] = val;
      }
      if (Object.keys(social).length > 0) {
        updates.socialLinks = { ...(lead.socialLinks || {}), ...social };
      }
    }

    return updates;
  }

  private buildWebsiteUpdates(lead: ILead, websiteData: WebsiteEnrichmentResult): Record<string, unknown> {
    const updates: Record<string, unknown> = {};

    if (websiteData.emails.length > 0) {
      const existingEmails = lead.emails || [];
      const merged = [...new Set([...existingEmails, ...websiteData.emails])];
      if (merged.length > existingEmails.length) {
        updates.emails = merged;
        if (!lead.email && websiteData.emails.length > 0) {
          updates.email = websiteData.emails[0];
        }
      }
    }

    if (websiteData.phones.length > 0) {
      const existingPhones = lead.phones || [];
      const existingPrimary = lead.phone;
      const merged = [...new Set([...existingPhones, ...websiteData.phones])];
      if (merged.length > existingPhones.length) {
        updates.phones = merged;
        if (!existingPrimary && websiteData.phones.length > 0) {
          updates.phone = websiteData.phones[0];
        }
      }
    }

    const existingSocial = (lead.socialLinks as Record<string, string | undefined>) || {};
    const newSocial: Record<string, string | undefined> = {};
    let socialChanged = false;
    for (const [platform, url] of Object.entries(websiteData.socialLinks)) {
      if (url && !existingSocial[platform]) {
        newSocial[platform] = url;
        socialChanged = true;
      }
    }
    if (socialChanged) {
      updates.socialLinks = { ...existingSocial, ...newSocial };
    }

    if (websiteData.companyName && !lead.companyName && websiteData.companyName.length > 0) {
      updates.companyName = websiteData.companyName;
    }

    return updates;
  }

  private mergeEnrichmentData(_result: EnrichmentResult): Record<string, unknown> {
    const updates: Record<string, unknown> = {};
    return updates;
  }
}
