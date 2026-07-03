"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crmService = exports.CRMService = void 0;
const logger_1 = require("../utils/logger");
const Lead_1 = require("../models/Lead");
const CrmNote_1 = require("../crm/models/CrmNote");
const CrmFollowUp_1 = require("../crm/models/CrmFollowUp");
const CrmActivity_1 = require("../crm/models/CrmActivity");
const types_1 = require("../crm/types");
class CRMService {
    async getAllLeads(options) {
        const page = options?.page || 1;
        const limit = options?.limit || 20;
        const leads = await Lead_1.Lead.find({})
            .sort({ stageUpdatedAt: -1, createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
        const total = await Lead_1.Lead.countDocuments({});
        return {
            leads,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }
    async getLeadsByStage(stage, options) {
        const page = options?.page || 1;
        const limit = options?.limit || 20;
        const leads = await Lead_1.Lead.find({ pipelineStage: stage })
            .sort({ stageUpdatedAt: -1, createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
        const total = await Lead_1.Lead.countDocuments({ pipelineStage: stage });
        return {
            leads,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }
    async updateLeadStage(leadId, newStage, userId) {
        const lead = await Lead_1.Lead.findById(leadId);
        if (!lead) {
            logger_1.logger.warn(`CRMService: Lead not found: ${leadId}`);
            return { success: false, message: 'Lead not found' };
        }
        const oldStage = lead.pipelineStage;
        if (oldStage === newStage) {
            return { success: true, message: 'Lead is already in this stage' };
        }
        lead.pipelineStage = newStage;
        lead.stageUpdatedAt = new Date();
        lead.lastContactedAt = new Date();
        await lead.save();
        const activity = new CrmActivity_1.Activity({
            leadId,
            type: 'stage-changed',
            previousValue: oldStage,
            updatedValue: newStage,
            description: `Moved from ${this.getStageLabel(oldStage)} to ${this.getStageLabel(newStage)}`,
            createdBy: userId,
        });
        await activity.save();
        lead.activityHistory = lead.activityHistory || [];
        lead.activityHistory.push({
            type: 'stage-changed',
            timestamp: new Date(),
            details: `Moved from ${this.getStageLabel(oldStage)} to ${this.getStageLabel(newStage)}`,
        });
        await lead.save();
        logger_1.logger.info(`CRMService: Lead ${leadId} moved from ${oldStage} to ${newStage}`);
        return {
            success: true,
            message: 'Stage updated successfully',
            lead: lead.toObject(),
            activity: activity.toObject(),
        };
    }
    async updateLeadCRMFields(leadId, fields, userId) {
        const lead = await Lead_1.Lead.findById(leadId);
        if (!lead) {
            return { success: false, message: 'Lead not found' };
        }
        if (fields.contactStatus !== undefined)
            lead.contactStatus = fields.contactStatus;
        if (fields.interestStatus !== undefined)
            lead.interestStatus = fields.interestStatus;
        if (fields.followUpDate !== undefined)
            lead.followUpDate = new Date(fields.followUpDate);
        if (fields.followUpNotes !== undefined)
            lead.followUpNotes = fields.followUpNotes;
        if (fields.salesNotes !== undefined)
            lead.salesNotes = fields.salesNotes;
        if (fields.discussionSummary !== undefined)
            lead.discussionSummary = fields.discussionSummary;
        if (fields.clientBudget !== undefined)
            lead.clientBudget = fields.clientBudget;
        if (fields.requiredServices !== undefined)
            lead.requiredServices = fields.requiredServices;
        if (fields.priorityLevel !== undefined)
            lead.priorityLevel = fields.priorityLevel;
        if (fields.proposalStatus !== undefined)
            lead.proposalStatus = fields.proposalStatus;
        if (fields.meetingStatus !== undefined)
            lead.meetingStatus = fields.meetingStatus;
        if (fields.assignedTo !== undefined)
            lead.assignedTo = fields.assignedTo;
        if (fields.dealValue !== undefined)
            lead.dealValue = fields.dealValue;
        if (fields.expectedClosingDate !== undefined)
            lead.expectedClosingDate = new Date(fields.expectedClosingDate);
        if (fields.whatsappNumber !== undefined)
            lead.whatsappNumber = fields.whatsappNumber;
        if (fields.tags !== undefined)
            lead.tags = fields.tags;
        let stageChanged = false;
        let newStage = lead.pipelineStage;
        if (fields.interestStatus !== undefined) {
            const stageMap = {
                'interested': 'interested',
                'not-interested': 'not-interested',
                'maybe-later': 'follow-up',
            };
            if (stageMap[fields.interestStatus]) {
                newStage = stageMap[fields.interestStatus];
                stageChanged = true;
            }
        }
        if (!stageChanged && fields.contactStatus !== undefined) {
            if (fields.contactStatus === 'contacted') {
                newStage = 'contacted';
                stageChanged = true;
            }
        }
        if (!stageChanged && fields.followUpDate !== undefined && fields.followUpDate) {
            newStage = 'follow-up';
            stageChanged = true;
        }
        if (fields.proposalStatus !== undefined) {
            const stageMap = {
                'pending': 'proposal-sent',
                'sent': 'proposal-sent',
                'approved': 'negotiation',
                'rejected': 'deal-lost',
            };
            if (stageMap[fields.proposalStatus]) {
                newStage = stageMap[fields.proposalStatus];
                stageChanged = true;
            }
        }
        if (fields.meetingStatus !== undefined) {
            if (fields.meetingStatus === 'scheduled') {
                newStage = 'meeting-scheduled';
                stageChanged = true;
            }
        }
        if (stageChanged && newStage !== lead.pipelineStage) {
            logger_1.logger.info(`CRMService: Auto-deriving stage for lead ${leadId}: ${lead.pipelineStage} -> ${newStage}`);
            lead.pipelineStage = newStage;
            lead.stageUpdatedAt = new Date();
        }
        await lead.save();
        const activity = new CrmActivity_1.Activity({
            leadId,
            type: 'lead-converted',
            updatedValue: 'CRM fields updated',
            description: 'Lead CRM details updated',
            createdBy: userId,
        });
        await activity.save();
        return { success: true, message: 'CRM fields updated', lead: lead.toObject() };
    }
    async addNote(leadId, content, userId) {
        const lead = await Lead_1.Lead.findById(leadId);
        if (!lead) {
            return { success: false, message: 'Lead not found' };
        }
        const note = new CrmNote_1.Note({ leadId, content, author: userId });
        await note.save();
        const activity = new CrmActivity_1.Activity({
            leadId, type: 'note-added',
            updatedValue: content.substring(0, 100),
            description: 'New note added',
            createdBy: userId,
        });
        await activity.save();
        lead.activityHistory = lead.activityHistory || [];
        lead.activityHistory.push({
            type: 'note-added', timestamp: new Date(),
            details: `Note: ${content.substring(0, 100)}...`,
        });
        await lead.save();
        return { success: true, message: 'Note added', note };
    }
    async updateNote(noteId, content, userId) {
        const note = await CrmNote_1.Note.findById(noteId);
        if (!note)
            return { success: false, message: 'Note not found' };
        note.content = content;
        await note.save();
        const activity = new CrmActivity_1.Activity({
            leadId: note.leadId, type: 'note-updated',
            previousValue: note.content, updatedValue: content.substring(0, 100),
            description: 'Note updated', createdBy: userId,
        });
        await activity.save();
        return { success: true, message: 'Note updated', note };
    }
    async deleteNote(noteId, userId) {
        const note = await CrmNote_1.Note.findById(noteId);
        if (!note)
            return { success: false, message: 'Note not found' };
        const leadId = note.leadId;
        await note.deleteOne();
        const activity = new CrmActivity_1.Activity({
            leadId, type: 'note-deleted',
            previousValue: note.content, description: 'Note deleted', createdBy: userId,
        });
        await activity.save();
        return { success: true, message: 'Note deleted' };
    }
    async getNotes(leadId) {
        return await CrmNote_1.Note.find({ leadId }).sort({ createdAt: -1 }).lean();
    }
    async createFollowUp(leadId, dueDate, note, userId) {
        const lead = await Lead_1.Lead.findById(leadId);
        if (!lead)
            return { success: false, message: 'Lead not found' };
        const followUp = new CrmFollowUp_1.FollowUp({ leadId, dueDate, note, completed: false });
        await followUp.save();
        lead.followUpDate = dueDate;
        await lead.save();
        const activity = new CrmActivity_1.Activity({
            leadId, type: 'follow-up-created',
            updatedValue: dueDate.toISOString(),
            description: `Follow-up scheduled for ${dueDate.toLocaleDateString()}`,
            createdBy: userId || 'system',
        });
        await activity.save();
        return { success: true, message: 'Follow-up created', followUp };
    }
    async updateFollowUp(followUpId, updates, userId) {
        const followUp = await CrmFollowUp_1.FollowUp.findById(followUpId);
        if (!followUp)
            return { success: false, message: 'Follow-up not found' };
        const oldCompleted = followUp.completed;
        if (updates.dueDate)
            followUp.dueDate = updates.dueDate;
        if (updates.note !== undefined)
            followUp.note = updates.note;
        if (updates.completed !== undefined) {
            followUp.completed = updates.completed;
            if (updates.completed && !oldCompleted)
                followUp.completedAt = new Date();
        }
        await followUp.save();
        const lead = await Lead_1.Lead.findById(followUp.leadId);
        if (lead) {
            lead.followUpDate = followUp.completed ? undefined : followUp.dueDate;
            await lead.save();
        }
        const activityType = updates.completed
            ? oldCompleted ? 'follow-up-updated' : 'follow-up-completed'
            : 'follow-up-updated';
        const activity = new CrmActivity_1.Activity({
            leadId: followUp.leadId, type: activityType,
            updatedValue: followUp.dueDate.toISOString(),
            description: updates.completed ? 'Follow-up completed' : 'Follow-up updated',
            createdBy: userId,
        });
        await activity.save();
        return { success: true, message: 'Follow-up updated', followUp };
    }
    async deleteFollowUp(followUpId, userId) {
        const followUp = await CrmFollowUp_1.FollowUp.findById(followUpId);
        if (!followUp)
            return { success: false, message: 'Follow-up not found' };
        const leadId = followUp.leadId;
        await followUp.deleteOne();
        const lead = await Lead_1.Lead.findById(leadId);
        if (lead) {
            lead.followUpDate = undefined;
            await lead.save();
        }
        const activity = new CrmActivity_1.Activity({
            leadId, type: 'follow-up-deleted', description: 'Follow-up deleted', createdBy: userId,
        });
        await activity.save();
        return { success: true, message: 'Follow-up deleted' };
    }
    async getFollowUps(leadId) {
        return await CrmFollowUp_1.FollowUp.find({ leadId }).sort({ dueDate: 1 }).lean();
    }
    async getActivities(leadId, options) {
        const query = { leadId };
        if (options?.type)
            query.type = options.type;
        return await CrmActivity_1.Activity.find(query).sort({ timestamp: -1 }).limit(options?.limit || 50).lean();
    }
    async getPipeline() {
        const stages = await Promise.all(types_1.PIPELINE_STAGES.map(async (stage) => {
            const leads = await Lead_1.Lead.find({ pipelineStage: stage.id })
                .sort({ stageUpdatedAt: -1, createdAt: -1 })
                .limit(50)
                .lean();
            return {
                id: stage.id,
                label: stage.label,
                order: stage.order,
                leads: leads.map((l) => ({ ...l, id: l._id.toString() })),
            };
        }));
        return { stages };
    }
    async getCRMStats() {
        const totalLeads = await Lead_1.Lead.countDocuments();
        const pipelineStats = await Lead_1.Lead.aggregate([
            { $group: { _id: '$pipelineStage', count: { $sum: 1 } } },
        ]);
        const leadsByStage = {};
        for (const stage of types_1.PIPELINE_STAGES)
            leadsByStage[stage.id] = 0;
        for (const stat of pipelineStats)
            leadsByStage[stat._id] = stat.count;
        const wonCount = leadsByStage['deal-won'] || 0;
        const conversionRate = totalLeads > 0 ? (wonCount / totalLeads) * 100 : 0;
        const overdueFollowUps = await CrmFollowUp_1.FollowUp.countDocuments({ completed: false, dueDate: { $lt: new Date() } });
        const totalContacted = await Lead_1.Lead.countDocuments({ pipelineStage: 'contacted' });
        const totalInterested = await Lead_1.Lead.countDocuments({ pipelineStage: 'interested' });
        const totalDealsWon = wonCount;
        const revenueResult = await Lead_1.Lead.aggregate([
            { $match: { pipelineStage: 'deal-won', dealValue: { $exists: true } } },
            { $group: { _id: null, total: { $sum: '$dealValue' } } },
        ]);
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;
        return {
            totalLeads,
            leadsByStage: leadsByStage,
            conversionRate,
            followUpReminders: 0,
            overdueFollowUps,
            pipelineVelocity: 0,
            totalContacted,
            totalInterested,
            totalDealsWon,
            totalRevenue,
        };
    }
    async getCRMAnalytics() {
        const allLeads = await Lead_1.Lead.find({}).lean();
        const totalLeads = allLeads.length;
        const leadsByStage = {};
        const revenueByStage = {};
        for (const stage of types_1.PIPELINE_STAGES) {
            leadsByStage[stage.id] = 0;
            revenueByStage[stage.id] = 0;
        }
        for (const lead of allLeads) {
            const stage = lead.pipelineStage || 'new-lead';
            leadsByStage[stage] = (leadsByStage[stage] || 0) + 1;
            if (lead.dealValue) {
                revenueByStage[stage] = (revenueByStage[stage] || 0) + lead.dealValue;
            }
        }
        const totalDealsWon = leadsByStage['deal-won'] || 0;
        const conversionRate = totalLeads > 0 ? (totalDealsWon / totalLeads) * 100 : 0;
        const totalRevenue = revenueByStage['deal-won'] || 0;
        const avgDealValue = totalDealsWon > 0 ? totalRevenue / totalDealsWon : 0;
        const followUpsOverdue = await CrmFollowUp_1.FollowUp.countDocuments({ completed: false, dueDate: { $lt: new Date() } });
        const followUpsPending = await CrmFollowUp_1.FollowUp.countDocuments({ completed: false });
        return {
            totalLeads,
            totalContacted: leadsByStage['contacted'] || 0,
            totalInterested: leadsByStage['interested'] || 0,
            totalNotInterested: leadsByStage['not-interested'] || 0,
            totalFollowUps: leadsByStage['follow-up'] || 0,
            totalMeetingsScheduled: leadsByStage['meeting-scheduled'] || 0,
            totalProposalsSent: leadsByStage['proposal-sent'] || 0,
            totalNegotiations: leadsByStage['negotiation'] || 0,
            totalDealsWon,
            totalDealsLost: leadsByStage['deal-lost'] || 0,
            conversionRate,
            totalRevenue,
            avgDealValue,
            followUpsPending,
            followUpsOverdue,
            leadsByStage: leadsByStage,
            revenueByStage: revenueByStage,
        };
    }
    async getLeadDetails(leadId) {
        const lead = await Lead_1.Lead.findById(leadId).lean();
        if (!lead)
            return null;
        const notesCount = await CrmNote_1.Note.countDocuments({ leadId });
        const lastNote = await CrmNote_1.Note.findOne({ leadId }).sort({ createdAt: -1 }).lean();
        const activityCount = await CrmActivity_1.Activity.countDocuments({ leadId });
        return {
            id: lead._id.toString(),
            companyName: lead.companyName,
            website: lead.website,
            phone: lead.phone,
            email: lead.email,
            address: lead.address,
            category: lead.category,
            source: lead.source,
            stage: lead.pipelineStage,
            leadScore: lead.leadScore,
            lastContactedAt: lead.lastContactedAt,
            followUpDate: lead.followUpDate,
            followUpNotes: lead.followUpNotes,
            hasFollowUp: !!lead.followUpDate,
            assignedTo: lead.assignedTo?.toString(),
            notesCount,
            lastNote: lastNote?.content,
            lastNoteDate: lastNote?.createdAt,
            activityCount,
            contactStatus: lead.contactStatus,
            interestStatus: lead.interestStatus,
            salesNotes: lead.salesNotes,
            discussionSummary: lead.discussionSummary,
            clientBudget: lead.clientBudget,
            requiredServices: lead.requiredServices,
            priorityLevel: lead.priorityLevel,
            proposalStatus: lead.proposalStatus,
            meetingStatus: lead.meetingStatus,
            dealValue: lead.dealValue,
            expectedClosingDate: lead.expectedClosingDate,
            whatsappNumber: lead.whatsappNumber,
            tags: lead.tags,
            stageUpdatedAt: lead.stageUpdatedAt,
        };
    }
    async assignLead(leadId, userId, assignedBy) {
        const lead = await Lead_1.Lead.findById(leadId);
        if (!lead)
            return { success: false, message: 'Lead not found' };
        lead.assignedTo = userId;
        await lead.save();
        const activity = new CrmActivity_1.Activity({
            leadId, type: 'lead-assigned',
            updatedValue: userId, description: 'Lead assigned', createdBy: assignedBy,
        });
        await activity.save();
        return { success: true, message: 'Lead assigned', lead: lead.toObject() };
    }
    async moveLead(leadId, fromStage, toStage, userId) {
        const fromStageObj = types_1.PIPELINE_STAGES.find((s) => s.id === fromStage);
        const toStageObj = types_1.PIPELINE_STAGES.find((s) => s.id === toStage);
        if (!fromStageObj || !toStageObj)
            return { success: false, message: 'Invalid stage' };
        return this.updateLeadStage(leadId, toStage, userId);
    }
    getStageLabel(stage) {
        const stageObj = types_1.PIPELINE_STAGES.find((s) => s.id === stage);
        return stageObj?.label || stage;
    }
}
exports.CRMService = CRMService;
exports.crmService = new CRMService();
//# sourceMappingURL=crm.service.js.map