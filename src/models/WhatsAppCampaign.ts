import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsAppCampaign extends Document {
  sessionId: string;
  status: 'created' | 'loading' | 'building' | 'ready' | 'running' | 'completed' | 'failed' | 'stopped' | 'logged_out';
  selectedLeadIds: string[];
  totalLeads: number;
  completedLeads: number;
  failedLeads: number;
  skippedLeads: number;
  currentLeadId: string | null;
  currentLeadIndex: number;
  currentStep: string;
  error: string | null;
  failureReason: string | null;
  logs: Array<{
    leadId: string;
    companyName: string;
    phone: string | null;
    status: string;
    timestamp: number;
    error?: string;
    message?: string;
    duration_ms?: number;
    attempt?: number;
    browser_state?: string;
  }>;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  eta: number | null;
  elapsedSeconds: number;
  processed: number;
  remaining: number;
  currentLead: string | null;
  leads: Array<{
    leadId: string;
    companyName: string;
    phone: string | null;
    website: string;
    city: string;
    messageType: string;
    queuePosition: number;
    status: string;
    error: string | null;
    attempts: number;
    durationMs: number;
    browserState: string;
    updatedAt: number;
    completedAt: number | null;
  }>;
}

const whatsAppCampaignSchema = new Schema<IWhatsAppCampaign>(
  {
    sessionId: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['created', 'loading', 'building', 'ready', 'running', 'completed', 'failed', 'stopped', 'logged_out'],
      default: 'created',
      index: true,
    },
    selectedLeadIds: [{ type: String, ref: 'Lead' }],
    totalLeads: { type: Number, default: 0 },
    completedLeads: { type: Number, default: 0 },
    failedLeads: { type: Number, default: 0 },
    skippedLeads: { type: Number, default: 0 },
    currentLeadId: { type: String, ref: 'Lead', default: null },
    currentLeadIndex: { type: Number, default: 0 },
    currentStep: { type: String, default: '' },
    error: { type: String, default: null },
    failureReason: { type: String, default: null },
    logs: [
      {
        leadId: String,
        companyName: String,
        phone: String || null,
        status: String,
        timestamp: Number,
        error: String,
        message: String,
        duration_ms: Number,
        attempt: Number,
        browser_state: String,
      },
    ],
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    eta: { type: Number, default: null },
    elapsedSeconds: { type: Number, default: 0 },
    processed: { type: Number, default: 0 },
    remaining: { type: Number, default: 0 },
    currentLead: { type: String, default: null },
    leads: [
      {
        leadId: String,
        companyName: String,
        phone: String || null,
        website: String,
        city: String,
        messageType: String,
        queuePosition: Number,
        status: String,
        error: String || null,
        attempts: Number,
        durationMs: Number,
        browserState: String,
        updatedAt: Number,
        completedAt: Number || null,
      },
    ],
  },
  { timestamps: true }
);

whatsAppCampaignSchema.index({ status: 1, createdAt: -1 });
whatsAppCampaignSchema.index({ selectedLeadIds: 1 });

export const WhatsAppCampaign = mongoose.model<IWhatsAppCampaign>(
  'WhatsAppCampaign',
  whatsAppCampaignSchema,
  'whatsapp_campaigns'
);
