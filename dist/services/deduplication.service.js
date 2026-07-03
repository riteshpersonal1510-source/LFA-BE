"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deduplicationService = exports.DeduplicationService = void 0;
class DeduplicationService {
    normalizeCompanyName(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .trim();
    }
    getDedupKey(lead) {
        const keys = [];
        const name = this.normalizeCompanyName(lead.companyName || '');
        if (!name)
            return keys;
        if (lead.phone) {
            const phoneDigits = lead.phone.replace(/[^\d]/g, '');
            if (phoneDigits.length >= 10) {
                keys.push(`phone:${phoneDigits}`);
            }
        }
        if (lead.website) {
            try {
                const parsed = new URL(lead.website);
                keys.push(`site:${parsed.hostname.replace(/^www\./, '')}`);
            }
            catch { }
        }
        if (lead.address) {
            const addr = lead.address.toLowerCase().trim();
            keys.push(`addr:${name}:${addr.slice(0, 40)}`);
        }
        keys.push(`name:${name}`);
        return keys;
    }
    findDuplicates(leads, existingKeys) {
        const unique = [];
        let duplicates = 0;
        const seen = new Set(existingKeys);
        for (const lead of leads) {
            if (!lead.companyName) {
                duplicates++;
                continue;
            }
            const keys = this.getDedupKey(lead);
            if (keys.length === 0) {
                unique.push(lead);
                continue;
            }
            let isDuplicate = false;
            for (const key of keys) {
                if (seen.has(key)) {
                    isDuplicate = true;
                    break;
                }
            }
            if (isDuplicate) {
                duplicates++;
            }
            else {
                for (const key of keys) {
                    seen.add(key);
                }
                unique.push(lead);
            }
        }
        return { unique, duplicates };
    }
    mergeExistingLeads(newLeads, existingLeads) {
        const existingKeySet = new Set();
        for (const lead of existingLeads) {
            const keys = this.getDedupKey(lead);
            for (const k of keys)
                existingKeySet.add(k);
        }
        const { unique, duplicates } = this.findDuplicates(newLeads, existingKeySet);
        const merged = unique.map(lead => {
            const normalizedName = this.normalizeCompanyName(lead.companyName || '');
            const existingMatch = existingLeads.find(e => this.normalizeCompanyName(e.companyName || '') === normalizedName);
            if (existingMatch) {
                const leadSources = lead.sources || [];
                const matchSources = existingMatch.sources || [];
                lead.sources = [...new Set([...leadSources, ...matchSources])];
            }
            return lead;
        });
        return { merged, duplicates };
    }
}
exports.DeduplicationService = DeduplicationService;
exports.deduplicationService = new DeduplicationService();
//# sourceMappingURL=deduplication.service.js.map