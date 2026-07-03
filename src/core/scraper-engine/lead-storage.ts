import { Lead } from '../../models/Lead';
import { logger } from '../../utils/logger';
import { ScraperLead } from './types';
import { leadNormalizer } from './lead-normalizer';
import { searchStatus } from '../../services/search-status.service';
import { leadEnrichmentPipeline } from '../../services/lead-enrichment-pipeline.service';
import { leadEnrichmentOrchestrator } from '../../enrichment';
import { monitorEngine } from '../../modules/automation-monitor/monitor-engine';

export interface StorageResult {
  totalStored: number;
  totalDuplicates: number;
  leads: ScraperLead[];
}

export interface StorageContext {
  keyword: string;
  location: string;
  area?: string;
  city?: string;
  state?: string;
  country?: string;
  businessType: string;
  fullSearchQuery?: string;
  semanticKeyword?: string;
  sessionId?: string;
  automationSessionId?: string;
  automationJobId?: string;
  dedupEnabled?: boolean;
  skipEnrichment?: boolean;
  onLeadSaved?: (saved: number, duplicates: number, rejected: number) => void | Promise<void>;
}

export type StorageContextRecord = StorageContext & Record<string, unknown>;

export class LeadStorage {
  private dedupCache = new Set<string>();
  private dedupCacheMaxSize = 50000;
  private normalizerCache = new Map<string, { lead: ScraperLead; dedupKeys: string[] }>();
  private normalizerCacheMaxSize = 20000;

  clearSessionCache(): void {
    this.dedupCache.clear();
    this.normalizerCache.clear();
  }

  private checkDedupCache(keys: string[]): boolean {
    for (const key of keys) {
      if (this.dedupCache.has(key)) return true;
    }
    return false;
  }

  private addToDedupCache(keys: string[]): void {
    if (this.dedupCache.size >= this.dedupCacheMaxSize) {
      this.dedupCache.clear();
      this.normalizerCache.clear();
    }
    for (const key of keys) {
      this.dedupCache.add(key);
    }
  }

  private getCachedNormalized(lead: ScraperLead): { lead: ScraperLead; dedupKeys: string[] } | null {
    const key = `${lead.companyName}|${lead.source}|${lead.placeId || ''}`;
    return this.normalizerCache.get(key) || null;
  }

  private setCachedNormalized(lead: ScraperLead, normalized: ScraperLead, dedupKeys: string[]): void {
    if (this.normalizerCache.size >= this.normalizerCacheMaxSize) return;
    const key = `${lead.companyName}|${lead.source}|${lead.placeId || ''}`;
    this.normalizerCache.set(key, { lead: normalized, dedupKeys });
  }

  async enrichLeads(
    leads: ScraperLead[],
    context: StorageContextRecord
  ): Promise<number> {
    if (leads.length === 0) return 0;

    const ops: Record<string, unknown>[] = [];
    let enriched = 0;

    for (const lead of leads) {
      if (!lead.companyName || lead.companyName.trim().length < 2) continue;

      const filter: Record<string, unknown> = {};
      if (lead.placeId) {
        filter['sourceMetadata.placeId'] = lead.placeId;
      } else {
        filter.companyName = lead.companyName;
        filter.source = lead.source;
      }

      const setFields: Record<string, unknown> = {
        enrichedAt: new Date().toISOString(),
      };
      if (lead.website) setFields.website = lead.website;
      if (lead.phone) setFields.phone = lead.phone;
      if (lead.email) setFields.email = lead.email;
      if (lead.address) setFields.address = lead.address;
      if (lead.pincode) setFields.pincode = lead.pincode;
      if (lead.postalCode) setFields.postalCode = lead.postalCode;
      if (lead.streetAddress) setFields.streetAddress = lead.streetAddress;
      if (lead.latitude !== undefined) setFields.latitude = lead.latitude;
      if (lead.longitude !== undefined) setFields.longitude = lead.longitude;
      if (lead.workingHours) setFields.workingHours = lead.workingHours;
      if (lead.businessStatus) setFields.businessStatus = lead.businessStatus;
      if (lead.plusCode) setFields.plusCode = lead.plusCode;
      if (lead.rating) setFields.rating = lead.rating;
      if (lead.reviewsCount) setFields.reviewsCount = lead.reviewsCount;
      if (lead.totalPhotos !== undefined) setFields.totalPhotos = lead.totalPhotos;
      if (lead.secondaryCategories && lead.secondaryCategories.length > 0) setFields.secondaryCategories = lead.secondaryCategories;
      if (lead.serviceOptions && lead.serviceOptions.length > 0) setFields.serviceOptions = lead.serviceOptions;
      if (lead.ownerClaimed !== undefined) setFields.ownerClaimed = lead.ownerClaimed;
      if (lead.category) setFields.category = lead.category;

      ops.push({
        updateOne: {
          filter,
          update: { $set: setFields },
          upsert: false,
        }
      });
      enriched++;
    }

    if (ops.length > 0) {
      try {
        await Lead.bulkWrite(ops as any, { ordered: false });
      } catch (err) {
        logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'LeadStorage: Enrich bulkWrite failed');
      }
    }

    if (enriched > 0 && context.sessionId) {
      for (const lead of leads.slice(0, enriched)) {
        searchStatus.addLiveLead(context.sessionId as string, lead.companyName, lead.source);
      }
    }

    return enriched;
  }

  async storeLeads(
    leads: ScraperLead[],
    context: StorageContextRecord
  ): Promise<StorageResult> {
    if (leads.length === 0) {
      return { totalStored: 0, totalDuplicates: 0, leads: [] };
    }

    const validLeads: Array<{ lead: ScraperLead; dedupKeys: string[] }> = [];
    let preFiltered = 0;

    for (const lead of leads) {
      if (!this.validateLead(lead)) {
        preFiltered++;
        continue;
      }
      const cached = this.getCachedNormalized(lead);
      if (cached) {
        validLeads.push(cached);
        continue;
      }
      const normalized = leadNormalizer.normalize(lead, {
        ...context,
        source: lead.source,
      });
      const dedupKeys = leadNormalizer.getDedupKey(normalized);
      this.setCachedNormalized(lead, normalized, dedupKeys);
      validLeads.push({ lead: normalized, dedupKeys });
    }

    if (validLeads.length === 0) {
      return { totalStored: 0, totalDuplicates: 0, leads: [] };
    }

    const batchSize = validLeads.length;
    const useBulkCheck = batchSize > 1;

    let existingLeadSet = new Set<string>();
    if (useBulkCheck) {
      const allConditions: Record<string, unknown>[] = [];
      for (const entry of validLeads) {
        for (const key of entry.dedupKeys) {
          const cond = this.dedupKeyToCondition(key);
          if (cond) allConditions.push(cond);
        }
      }
      if (allConditions.length > 0) {
        try {
          const existingDocs = await Lead.find(
            { $or: allConditions },
            'phone website companyName sourceUrl sourceMetadata.placeId'
          ).lean();
          for (const doc of existingDocs) {
            if (doc.phone) existingLeadSet.add(`phone:${doc.phone}`);
            if (doc.website) existingLeadSet.add(`website:${doc.website}`);
            if (doc.sourceUrl) existingLeadSet.add(`sourceUrl:${doc.sourceUrl}`);
            if ((doc as any).sourceMetadata?.placeId) existingLeadSet.add(`placeId:${(doc as any).sourceMetadata.placeId}`);
            if ((doc as any).latitude !== undefined && (doc as any).longitude !== undefined) {
              existingLeadSet.add(`coords:${Number((doc as any).latitude).toFixed(5)},${Number((doc as any).longitude).toFixed(5)}`);
            }
            if (doc.companyName && doc.address) {
              const name = doc.companyName.toLowerCase().replace(/\s+/g, '');
              const addr = doc.address.toLowerCase().replace(/\s+/g, '');
              existingLeadSet.add(`nameaddr:${name}|${addr}`);
            } else if (doc.companyName) {
              existingLeadSet.add(`name:${doc.companyName.toLowerCase().replace(/\s+/g, '')}|`);
            }
          }
        } catch (err) {
          logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'LeadStorage: Bulk duplicate check failed, falling back');
        }
      }
    }

    const newLeads: ScraperLead[] = [];
    let totalDuplicates = 0;

    for (const entry of validLeads) {
      const cachedDup = this.checkDedupCache(entry.dedupKeys);
      const isDuplicate = cachedDup
        || (!useBulkCheck
          ? !!(await this.findDuplicate(entry.dedupKeys))
          : entry.dedupKeys.some(k => existingLeadSet.has(k)));

      if (isDuplicate) {
        totalDuplicates++;
        this.addToDedupCache(entry.dedupKeys);
        if (context.sessionId) {
          searchStatus.incrementDuplicates(context.sessionId as string);
        }
        if (context.automationSessionId) {
          monitorEngine.onDuplicateSkipped(context.automationSessionId, entry.lead.companyName, 1);
          await context.onLeadSaved?.(0, 1, 0);
        }
      } else {
        this.addToDedupCache(entry.dedupKeys);
        newLeads.push(entry.lead);
      }
    }

    let totalStored = 0;
    const stored: ScraperLead[] = [];

    if (newLeads.length > 0) {
      const newDocs = newLeads.map(lead => ({
        companyName: lead.companyName,
        website: lead.website || undefined,
        phone: lead.phone || undefined,
        email: lead.email || undefined,
        address: lead.address || undefined,
        category: lead.category || undefined,
        secondaryCategories: lead.secondaryCategories && lead.secondaryCategories.length > 0 ? lead.secondaryCategories : undefined,
        source: lead.source,
        rating: lead.rating || undefined,
        reviewsCount: lead.reviewsCount || undefined,
        totalPhotos: lead.totalPhotos !== undefined ? lead.totalPhotos : undefined,
        leadScore: this.calculateLeadScore(lead),
        sourceUrl: lead.sourceUrl,
        extractionSource: lead.source,
        relevanceScore: lead.relevanceScore || 0,
        locationConfidence: lead.locationRelevanceScore || 0,
        searchedKeyword: context.keyword || '',
        searchedLocation: context.location || '',
        searchedArea: context.area || '',
        searchedCity: context.city || '',
        searchedState: context.state || '',
        searchedCountry: context.country || '',
        searchedBusinessType: context.businessType || '',
        fullSearchQuery: context.fullSearchQuery || '',
        searchRank: (lead as any).searchRank || undefined,
        semanticKeyword: context.semanticKeyword || context.keyword,
        searchSessionId: context.automationSessionId || context.sessionId || undefined,
        pincode: (lead as any).pincode || undefined,
        postalCode: (lead as any).postalCode || undefined,
        streetAddress: (lead as any).streetAddress || undefined,
        latitude: (lead as any).latitude !== undefined ? (lead as any).latitude : undefined,
        longitude: (lead as any).longitude !== undefined ? (lead as any).longitude : undefined,
        workingHours: (lead as any).workingHours || undefined,
        businessStatus: (lead as any).businessStatus || undefined,
        serviceOptions: (lead as any).serviceOptions && (lead as any).serviceOptions.length > 0 ? (lead as any).serviceOptions : undefined,
        ownerClaimed: (lead as any).ownerClaimed !== undefined ? (lead as any).ownerClaimed : undefined,
        plusCode: (lead as any).plusCode || undefined,
        sourceMetadata: {
          source: lead.source,
          placeId: (lead as any).placeId || undefined,
          extractedAt: new Date().toISOString(),
          searchedKeyword: context.keyword || '',
          searchedLocation: context.location || '',
          searchedCountry: context.country || '',
          searchedArea: context.area || '',
          searchedCity: context.city || '',
          searchedState: context.state || '',
          semanticKeyword: context.semanticKeyword || context.keyword,
        },
      }));

      const trackedFields = ['companyName','website','phone','email','address','category','secondaryCategories','rating','reviewsCount','totalPhotos','pincode','postalCode','streetAddress','latitude','longitude','workingHours','businessStatus','serviceOptions','ownerClaimed','plusCode','sourceUrl','source'];
      for (const doc of newDocs) {
        const present = trackedFields.filter(f => doc[f as keyof typeof doc] !== undefined && doc[f as keyof typeof doc] !== null && doc[f as keyof typeof doc] !== '');
        const missing = trackedFields.filter(f => doc[f as keyof typeof doc] === undefined || doc[f as keyof typeof doc] === null || doc[f as keyof typeof doc] === '');
        if (missing.length > 0) {
          logger.debug({ company: doc.companyName, present, missing }, '[LeadStorage] Field-level tracking');
        }
      }

      try {
        const inserted = await Lead.insertMany(newDocs, { ordered: false });
        totalStored = inserted.length;
        stored.push(...newLeads);

        if (context.sessionId) {
          searchStatus.incrementSaved(context.sessionId as string, totalStored);
        }
        if (context.automationSessionId) {
          monitorEngine.onLeadSaved(
            context.automationSessionId,
            `${totalStored} leads`,
            'bulk',
            totalStored
          );
          await context.onLeadSaved?.(totalStored, 0, 0);
        }

        if (!context.skipEnrichment && (inserted as any).length > 0) {
          const leadIds: string[] = [];
          for (let i = 0; i < totalStored; i++) {
            const leadId = (inserted[i] as any)._id?.toString();
            if (leadId) leadIds.push(leadId);

            if (context.sessionId) {
              searchStatus.addLiveLead(context.sessionId as string, newLeads[i].companyName, newLeads[i].source);
            }
          }
          leadEnrichmentPipeline.enqueueMultiple(leadIds);
          leadEnrichmentOrchestrator.enqueueMultiple(leadIds);
        } else if ((inserted as any).length > 0) {
          for (let i = 0; i < totalStored; i++) {
            if (context.sessionId) {
              searchStatus.addLiveLead(context.sessionId as string, newLeads[i].companyName, newLeads[i].source);
            }
          }
        }

        logger.info({
          action: 'lead_saved',
          stored: totalStored,
          duplicates: totalDuplicates,
          batchSize,
          sessionId: context.sessionId,
        }, `[LEAD_SAVED] ${totalStored} leads saved, ${totalDuplicates} duplicates in batch`);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.error({ err: errMsg }, 'LeadStorage: Batch insert failed, falling back to individual saves');

        for (const doc of newDocs) {
          try {
            await new Lead(doc).save();
            totalStored++;
            const leadIdx = newDocs.indexOf(doc);
            if (leadIdx >= 0) stored.push(newLeads[leadIdx]);

            if (context.sessionId) {
              searchStatus.incrementSaved(context.sessionId as string);
              searchStatus.addLiveLead(context.sessionId as string, doc.companyName, doc.source);
            }
          } catch {
            if (context.sessionId) {
              searchStatus.incrementFailed(context.sessionId as string);
            }
          }
        }
      }
    }

    return { totalStored, totalDuplicates, leads: stored };
  }

  private validateLead(lead: ScraperLead): boolean {
    if (!lead.companyName || lead.companyName.trim().length < 2) return false;
    return true;
  }

  private dedupKeyToCondition(key: string): Record<string, unknown> | null {
    if (key.startsWith('phone:')) {
      return { phone: key.replace('phone:', '') };
    }
    if (key.startsWith('website:')) {
      return { website: key.replace('website:', '') };
    }
    if (key.startsWith('placeId:')) {
      return { 'sourceMetadata.placeId': key.replace('placeId:', '') };
    }
    if (key.startsWith('sourceUrl:')) {
      return { sourceUrl: key.replace('sourceUrl:', '') };
    }
    if (key.startsWith('nameaddr:')) {
      const payload = key.replace('nameaddr:', '');
      const [namePart, addrPart] = payload.split('|');
      return {
        companyName: { $regex: new RegExp(`^${namePart}$`, 'i') },
        address: { $regex: new RegExp(addrPart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      };
    }
    if (key.startsWith('coords:')) {
      const [latStr, lngStr] = key.replace('coords:', '').split(',');
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        return {
          latitude: { $gte: lat - 0.0001, $lte: lat + 0.0001 },
          longitude: { $gte: lng - 0.0001, $lte: lng + 0.0001 },
        };
      }
    }
    if (key.startsWith('name:')) {
      const parts = key.replace('name:', '').split('|');
      return { companyName: { $regex: new RegExp(`^${parts[0]}$`, 'i') } };
    }
    return null;
  }

  private async findDuplicate(keys: string[]): Promise<boolean> {
    if (keys.length === 0) return false;
    const conditions: Record<string, unknown>[] = [];

    for (const key of keys) {
      const cond = this.dedupKeyToCondition(key);
      if (cond) conditions.push(cond);
    }

    if (conditions.length === 0) return false;

    const existing = await Lead.findOne({ $or: conditions }).catch(() => null);
    return !!existing;
  }

  private calculateLeadScore(lead: ScraperLead): number {
    let score = 0;
    if (lead.website) score += 20;
    if (lead.phone) score += 15;
    if (lead.email) score += 15;
    if (lead.address) score += 10;
    if (lead.streetAddress) score += 3;
    if (lead.postalCode) score += 2;
    if (lead.category) score += 5;
    if (lead.secondaryCategories && lead.secondaryCategories.length > 0) score += 3;
    if (lead.rating && lead.rating > 0) score += 5;
    if (lead.reviewsCount && lead.reviewsCount > 0) score += 5;
    if (lead.reviewsCount && lead.reviewsCount > 50) score += 3;
    if (lead.workingHours) score += 5;
    if (lead.businessStatus) score += 3;
    if (lead.plusCode) score += 2;
    if (lead.latitude !== undefined && lead.longitude !== undefined) score += 3;
    if (lead.serviceOptions && lead.serviceOptions.length > 0) score += 2;
    if (lead.ownerClaimed) score += 2;
    return Math.min(score, 100);
  }
}

export const leadStorage = new LeadStorage();
