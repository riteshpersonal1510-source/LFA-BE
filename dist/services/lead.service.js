"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadService = void 0;
const Lead_1 = require("../models/Lead");
const logger_1 = require("../utils/logger");
const website_analysis_service_1 = require("./website-analysis.service");
const audit_cache_service_1 = require("./audit-cache.service");
class LeadService {
    async getAllLeads(options = {}) {
        const { page = 1, limit = 10, keyword, location, state, city, area, category, source, sources, minRating, minLeadScore, maxLeadScore, websiteStatus, qualificationLevel, hasWebsite, hasPhone, sort, businessType, } = options;
        logger_1.logger.debug(`LeadService: Fetching leads (page: ${page}, limit: ${limit})`);
        const query = {};
        const andClauses = [];
        if (keyword) {
            andClauses.push({ $or: [
                    { companyName: { $regex: keyword, $options: 'i' } },
                    { website: { $regex: keyword, $options: 'i' } },
                    { phone: { $regex: keyword } },
                    { address: { $regex: keyword, $options: 'i' } },
                    { category: { $regex: keyword, $options: 'i' } },
                    { searchedKeyword: { $regex: keyword, $options: 'i' } },
                ] });
        }
        if (state && city) {
            let locationQuery = city;
            if (state) {
                locationQuery = `${city}, ${state}`;
            }
            if (area) {
                locationQuery = `${area}, ${city}, ${state}`;
            }
            andClauses.push({ $or: [
                    { address: { $regex: locationQuery, $options: 'i' } },
                    { companyName: { $regex: locationQuery, $options: 'i' } },
                    { category: { $regex: locationQuery, $options: 'i' } },
                    { searchedLocation: { $regex: locationQuery, $options: 'i' } },
                ] });
        }
        else if (location) {
            andClauses.push({ $or: [
                    { address: { $regex: location, $options: 'i' } },
                    { companyName: { $regex: location, $options: 'i' } },
                    { category: { $regex: location, $options: 'i' } },
                    { searchedLocation: { $regex: location, $options: 'i' } },
                ] });
        }
        if (area) {
            andClauses.push({ searchedArea: { $regex: area, $options: 'i' } });
        }
        if (city && !area) {
            andClauses.push({ searchedCity: { $regex: city, $options: 'i' } });
        }
        if (state && !area && !city) {
            andClauses.push({ searchedState: { $regex: state, $options: 'i' } });
        }
        if (businessType) {
            andClauses.push({ searchedBusinessType: { $regex: businessType, $options: 'i' } });
        }
        if (category) {
            query.category = { $regex: category, $options: 'i' };
        }
        if (source) {
            query.source = source;
        }
        if (sources && sources.length > 0) {
            query.source = { $in: sources };
        }
        if (minRating !== undefined) {
            query.rating = { $gte: minRating };
        }
        if (minLeadScore !== undefined) {
            query.leadScore = { ...(query.leadScore || {}), $gte: minLeadScore };
        }
        if (maxLeadScore !== undefined) {
            query.leadScore = { ...(query.leadScore || {}), $lte: maxLeadScore };
        }
        if (websiteStatus) {
            query.websiteStatus = websiteStatus;
        }
        if (qualificationLevel) {
            query.qualificationLevel = qualificationLevel;
        }
        if (hasWebsite === true) {
            andClauses.push({ website: { $exists: true, $nin: [null, ''] } });
        }
        else if (hasWebsite === false) {
            andClauses.push({ $or: [{ website: { $exists: false } }, { website: null }, { website: '' }] });
        }
        if (hasPhone === true) {
            andClauses.push({ phone: { $exists: true, $nin: [null, ''] } });
        }
        else if (hasPhone === false) {
            andClauses.push({ $or: [{ phone: { $exists: false } }, { phone: null }, { phone: '' }] });
        }
        if (options.minConfidence !== undefined) {
            andClauses.push({ finalConfidence: { $gte: options.minConfidence } });
        }
        if (options.maxConfidence !== undefined) {
            andClauses.push({ finalConfidence: { $lte: options.maxConfidence } });
        }
        if (options.validationStatus) {
            andClauses.push({ validationStatus: options.validationStatus });
        }
        if (options.aiQuality) {
            andClauses.push({ aiQuality: options.aiQuality });
        }
        if (andClauses.length > 0) {
            query.$and = andClauses;
        }
        let sortOptions = {};
        if (sort && sort.field) {
            const order = sort.order === 'asc' ? 1 : -1;
            sortOptions[sort.field] = order;
        }
        else {
            sortOptions = { createdAt: -1 };
        }
        const skip = (page - 1) * limit;
        const [total, rawLeads] = await Promise.all([
            Lead_1.Lead.countDocuments(query),
            Lead_1.Lead.find(query).sort(sortOptions).skip(skip).limit(limit).lean(),
        ]);
        const leads = rawLeads.map(lead => ({
            ...lead,
            id: lead._id ? lead._id.toString() : lead.id,
        }));
        return {
            leads,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit) || 1,
            },
        };
    }
    async getLeadById(id) {
        const lead = await Lead_1.Lead.findById(id).lean();
        if (!lead) {
            logger_1.logger.warn(`LeadService: Lead not found with ID: ${id}`);
        }
        return lead;
    }
    async createLead(data) {
        const analysis = website_analysis_service_1.websiteAnalysisService.getLeadFields(data.website);
        const enrichedData = {
            ...data,
            website: analysis.website,
            hasWebsite: analysis.hasWebsite,
            normalizedDomain: analysis.normalizedDomain,
            analysisEligible: analysis.analysisEligible,
            hasRealWebsite: analysis.hasRealWebsite,
            websiteType: analysis.websiteType,
            websiteAuditAllowed: analysis.websiteAuditAllowed,
        };
        const lead = new Lead_1.Lead(enrichedData);
        await lead.save();
        logger_1.logger.debug(`LeadService: Created lead - ${lead.companyName} (analysisEligible=${analysis.analysisEligible})`);
        return lead;
    }
    async updateLead(id, data) {
        logger_1.logger.debug(`LeadService: Updating lead with ID: ${id}`);
        const updateData = { ...data };
        if (updateData.website !== undefined) {
            const existingLead = await Lead_1.Lead.findById(id).select('website').lean();
            const oldWebsite = existingLead?.website;
            if (oldWebsite && oldWebsite !== updateData.website) {
                audit_cache_service_1.auditCache.clear();
                logger_1.logger.info(`[LeadService] Website changed for lead ${id}: "${oldWebsite}" → "${updateData.website}" — invalidated all caches`);
            }
            const analysis = website_analysis_service_1.websiteAnalysisService.getLeadFields(updateData.website);
            updateData.website = analysis.website;
            updateData.hasWebsite = analysis.hasWebsite;
            updateData.normalizedDomain = analysis.normalizedDomain;
            updateData.analysisEligible = analysis.analysisEligible;
            updateData.hasRealWebsite = analysis.hasRealWebsite;
            updateData.websiteType = analysis.websiteType;
            updateData.websiteAuditAllowed = analysis.websiteAuditAllowed;
        }
        const lead = await Lead_1.Lead.findByIdAndUpdate(id, updateData, { new: true });
        if (!lead) {
            logger_1.logger.warn(`LeadService: Lead not found with ID: ${id}`);
        }
        return lead;
    }
    async deleteLead(id) {
        logger_1.logger.debug(`LeadService: Deleting lead with ID: ${id}`);
        const result = await Lead_1.Lead.findByIdAndDelete(id);
        return !!result;
    }
    async bulkCreateLeads(leads) {
        let created = 0;
        let duplicates = 0;
        for (const lead of leads) {
            try {
                const existing = await Lead_1.Lead.findOne({
                    $or: [
                        { companyName: lead.companyName, phone: lead.phone },
                        { website: lead.website },
                    ],
                });
                if (existing) {
                    duplicates++;
                    continue;
                }
                const analysis = website_analysis_service_1.websiteAnalysisService.getLeadFields(lead.website);
                const enrichedData = {
                    ...lead,
                    website: analysis.website,
                    hasWebsite: analysis.hasWebsite,
                    normalizedDomain: analysis.normalizedDomain,
                    analysisEligible: analysis.analysisEligible,
                    hasRealWebsite: analysis.hasRealWebsite,
                    websiteType: analysis.websiteType,
                    websiteAuditAllowed: analysis.websiteAuditAllowed,
                };
                const newLead = new Lead_1.Lead(enrichedData);
                await newLead.save();
                created++;
            }
            catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                logger_1.logger.warn({ err: message }, 'LeadService: Failed to create lead');
                duplicates++;
            }
        }
        logger_1.logger.debug(`LeadService: Bulk create completed - ${created} created, ${duplicates} duplicates`);
        return { created, duplicates };
    }
    async deleteAllLeads() {
        logger_1.logger.warn('LeadService: Deleting ALL leads from database');
        const result = await Lead_1.Lead.deleteMany({});
        logger_1.logger.warn(`LeadService: Deleted ${result.deletedCount} leads`);
        return { deletedCount: result.deletedCount };
    }
    async getDistinctCategories() {
        const categories = await Lead_1.Lead.distinct('category', {
            category: { $exists: true, $nin: [null, ''] },
        });
        return categories.sort();
    }
    async getDuplicateCheck(companyName, phone) {
        const query = { companyName };
        if (phone) {
            query.phone = phone;
        }
        const existing = await Lead_1.Lead.findOne(query);
        return !!existing;
    }
}
exports.LeadService = LeadService;
//# sourceMappingURL=lead.service.js.map