import { Schema, model, Document } from 'mongoose';
import { WEBSITE_STATUSES, LEAD_SOURCES, EXTRACTION_SOURCES } from '../constants';
import type { WebsiteClassificationType, SocialProfiles } from '../modules/leads/services/urlClassifier.service';
import { setLeadClassificationFields } from '../modules/leads/services/urlClassifier.service';

export type AuditStatusValue = 'pending' | 'running' | 'completed' | 'failed';
export type AIStatusValue = 'pending' | 'queued' | 'processing' | 'completed' | 'failed';

export interface ILead extends Document {
  companyName: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  category?: string;
  secondaryCategories?: string[];
  industry?: string;
  semanticCategory?: string;
  semanticCategoryName?: string;
  matchedKeyword?: string;
  originalSearchedKeyword?: string;
  searchGroup?: string;
  semanticMatchReason?: string;
  expandedFromKeyword?: string;
  semanticKeyword?: string;
  searchSessionId?: string;
  source: typeof LEAD_SOURCES[number];
  sourceUrl?: string;
  extractionSource?: typeof EXTRACTION_SOURCES[number];
  sourceMetadata?: Record<string, unknown>;
  searchedKeyword?: string;
  searchedLocation?: string;
  searchedArea?: string;
  searchedCity?: string;
  searchedState?: string;
  searchedCountry?: string;
  searchedBusinessType?: string;
  fullSearchQuery?: string;
  searchRank?: number;
  sources?: string[];
  relevanceScore?: number;
  validatedCategory?: string;
  locationConfidence?: number;
  categoryConfidence?: number;
  finalConfidence?: number;
  validationStatus?: 'validated' | 'rejected' | 'needs-review';
  rejectionReason?: string;
  aiMatchType?: string;
  aiWarnings?: string[];
  aiQuality?: 'excellent' | 'good' | 'average' | 'poor';
  websiteStatus: typeof WEBSITE_STATUSES[number];
  rating?: number;
  reviewsCount?: number;
  totalPhotos?: number;
  pincode?: string;
  postalCode?: string;
  streetAddress?: string;
  latitude?: number;
  longitude?: number;
  workingHours?: string;
  businessStatus?: string;
  serviceOptions?: string[];
  ownerClaimed?: boolean;
  plusCode?: string;
  placeId?: string;
  leadScore: number;

  // AI Pipeline status fields
  aiStatus?: AIStatusValue;
  aiProgress?: number;
  aiCurrentStep?: string;
  aiCurrentStepIndex?: number;
  aiTotalSteps?: number;
  aiError?: string;
  processingStartedAt?: Date;
  processingCompletedAt?: Date;
  lastAuditAt?: Date;
  reportGenerated?: boolean;
  responsiveAuditReady?: boolean;
  intelligenceReady?: boolean;
  outreachReady?: boolean;
  salesAIReady?: boolean;
  reportReady?: boolean;
  aiWebsiteHash?: string;

  // Lead Enrichment Pipeline status
  enrichmentStatus?: 'pending' | 'running' | 'completed' | 'failed';
  enrichmentStartedAt?: Date;
  enrichmentCompletedAt?: Date;
  enrichmentError?: string;
  enrichmentProgress?: number;
  enrichmentCurrentStep?: string;

  // Phase 3 AI Analysis fields
  seoAudit?: {
    title: string;
    titleLength: number;
    titleOk: boolean;
    metaDescription: string;
    metaDescriptionLength: number;
    metaDescriptionOk: boolean;
    h1Count: number;
    h1Present: boolean;
    h1Text: string;
    robotsMeta: string;
    canonicalUrl: string;
    canonicalPresent: boolean;
    ogTitle: string;
    ogDescription: string;
    ogImage: string;
    ogPresent: boolean;
    twitterCard: string;
    twitterPresent: boolean;
    jsonLdPresent: boolean;
    jsonLdTypes: string[];
    hasSchemaOrg: boolean;
    schemaOrgTypes: string[];
    faviconPresent: boolean;
    score: number;
    issues: string[];
  };
  performanceAudit?: {
    loadTimeMs: number;
    domReadyMs: number;
    lcpEstimateMs: number;
    pageWeightKB: number;
    requestCount: number;
    heavyImages: number;
    largeScripts: number;
    renderBlockingResources: number;
    score: number;
    issues: string[];
  };
  websiteOpportunity?: {
    websiteExists: boolean;
    websiteMissing: boolean;
    websiteOutdated: boolean;
    noMobileOptimization: boolean;
    missingContactInfo: boolean;
    missingSeo: boolean;
    missingSocialPresence: boolean;
    noSsl: boolean;
    opportunity: 'high' | 'medium' | 'low';
    explanation: string;
    recommendedServices: string[];
  };
  priority?: 'high' | 'medium' | 'low';
  scoreReasoning?: string[];
  scoreBreakdown?: {
    websitePresence: number;
    contactInfo: number;
    responsiveScore: number;
    seoScore: number;
    socialPresence: number;
    businessStrength: number;
    websiteQuality: number;
  };
  analysisTimestamp?: string;
  generatedEmail?: string;
  generatedWhatsApp?: string;
  generatedCallScript?: string;
  generatedWebsiteProposal?: string;
  outreachSubject?: string;
  analysisReport?: Record<string, unknown>;
  recommendations?: string[];

  responsiveStatus?: 'excellent' | 'good' | 'average' | 'poor' | 'critical';
  websiteAudit?: {
    https: boolean;
    pageTitle: string;
    metaDescription: string;
    favicon: string;
    logo: string;
    contactPage: 'found' | 'missing' | 'broken';
    aboutPage: 'found' | 'missing';
    servicesPage: 'found' | 'missing';
    privacyPolicy: boolean;
    terms: boolean;
    cookieBanner: boolean;
    contactForm: boolean;
    emailPresent: boolean;
    phonePresent: boolean;
    socialMedia: Record<string, boolean>;
    cms: string;
    detectedIssues: string[];
    score: number;
  };

  auditStatus?: {
    responsive: AuditStatusValue;
    intelligence: AuditStatusValue;
    seo: AuditStatusValue;
    uiux: AuditStatusValue;
    overall: AuditStatusValue;
  };
  hasRealWebsite?: boolean;
  hasWebsite?: boolean;
  websiteReachable?: boolean;
  normalizedDomain?: string;
  analysisEligible?: boolean;
  websitePresence?: 'YES' | 'NO';
  detectedWebsiteType?: 'STANDALONE' | 'PROFILE_ONLY' | 'UNKNOWN';
  socialPlatform?: string;
  websiteType?: WebsiteClassificationType;
  websiteClassification?: 'business_website' | 'social_profile' | 'google_business_profile' | 'directory_listing' | 'no_website';
  websiteAuditAllowed?: boolean;
  socialPlatforms?: string[];
  primaryPlatform?: string;
  socialProfiles?: SocialProfiles;
  verificationScore?: number;
  leadTrustScore?: number;
  leadDataQuality?: number;
  phoneVerificationStatus?: 'valid' | 'invalid' | 'risky' | 'unverified';
  emailVerificationStatus?: 'valid' | 'invalid' | 'risky' | 'unknown' | 'unverified';
  websiteIntelligenceCompletedAt?: Date;
  websiteMetadata?: {
    title?: string;
    description?: string;
    favicon?: string;
    logo?: string;
    language?: string;
    httpsEnabled?: boolean;
    canonicalUrl?: string;
    cms?: string;
  };
  websiteQuality?: {
    sslEnabled?: boolean;
    brokenNavigation?: boolean;
    contactPageStatus?: 'found' | 'missing' | 'broken';
    aboutPageStatus?: 'found' | 'missing';
    servicesPageStatus?: 'found' | 'missing';
    hasContactForm?: boolean;
    hasEmail?: boolean;
    hasPhone?: boolean;
    issues: string[];
    score: number;
  };
  marketplaceLinks?: {
    justdial?: string;
    indiamart?: string;
    amazon?: string;
    flipkart?: string;
    meesho?: string;
    tradeindia?: string;
    other?: string[];
  };
  mapsLinks?: string[];

  // CRM Pipeline fields
  pipelineStage: 'new-lead' | 'contacted' | 'interested' | 'not-interested' | 'follow-up' | 'meeting-scheduled' | 'proposal-sent' | 'negotiation' | 'deal-won' | 'deal-lost';
  assignedTo?: string;
  lastContactedAt?: Date;
  followUpDate?: Date;
  followUpNotes?: string;
  leadStatus: 'active' | 'pending' | 'qualified' | 'disqualified';

  // Extended CRM fields
  contactStatus?: 'contacted' | 'not-contacted';
  interestStatus?: 'interested' | 'not-interested' | 'maybe-later';
  salesNotes?: string;
  discussionSummary?: string;
  clientBudget?: number;
  requiredServices?: string[];
  priorityLevel?: 'high' | 'medium' | 'low';
  proposalStatus?: 'pending' | 'sent' | 'approved' | 'rejected';
  meetingStatus?: 'scheduled' | 'completed' | 'cancelled';
  dealValue?: number;
  expectedClosingDate?: Date;
  whatsappNumber?: string;
  tags?: string[];
  stageUpdatedAt?: Date;

  // WhatsApp Campaign fields
  normalizedPhone?: string;
  isWhatsAppValid?: boolean;
  validationReason?: string;
  campaignStatus?: 'pending' | 'preparing' | 'validating' | 'sending' | 'completed' | 'stopped' | 'failed';
  lastSent?: Date | null;
  attempts?: number;

  // Activity tracking
  // Activity tracking
  activityHistory?: {
    type: string;
    timestamp: Date;
    details?: string;
  }[];

  // Contact extraction fields
  emails?: string[];
  phones?: string[];

  // Email discovery fields
  discoveredEmails?: Array<{
    email: string;
    type: string;
    sourcePage: string;
    confidence: number;
    verified: boolean;
  }>;
  primaryEmail?: string;
  emailCount?: number;
  lastEmailScan?: Date;
  emailDiscoveryStatus?: 'pending' | 'scanning' | 'completed' | 'failed' | 'skipped';
  emailDiscoveryError?: string;
  emailDiscoveryRetries?: number;

  socialLinks?: {
    instagram?: string;
    facebook?: string;
    whatsapp?: string;
    linkedin?: string;
    youtube?: string;
    twitter?: string;
    telegram?: string;
    snapchat?: string;
    pinterest?: string;
    linktree?: string;
    other?: string[];
  };
  contactPages?: string[];
  ownerNames?: string[];
  extractionStatus?: 'success' | 'partial' | 'failed';
  extractedAt?: Date;

  // Analysis fields
  qualificationLevel?: 'high-potential' | 'medium-potential' | 'low-potential';
  sslEnabled?: boolean;
  responseTime?: number;
  metaTitle?: string;
  metaDescription?: string;
  hasContactPage?: boolean;
  hasSocialLinks?: {
    facebook?: boolean;
    instagram?: boolean;
    linkedin?: boolean;
    twitter?: boolean;
    aiSummary?: string;
    aiWeaknesses?: string[];
    aiOpportunities?: string[];
  };
  analyzedAt?: Date;
  aiLeadScore?: number;
  aiQualificationLevel?: 'high-potential' | 'medium-potential' | 'low-potential';
  aiSummary?: string;
  aiWeaknesses?: string[];
  aiOpportunities?: string[];
  aiAnalyzedAt?: Date;

  responsiveAudit?: {
    mobileFriendly: boolean;
    responsiveLayout: boolean;
    horizontalScroll: boolean;
    overflowIssues: boolean;
    viewportMeta: boolean;
    viewportContent?: string;
    touchFriendly: boolean;
    fontSizeIssues: boolean;
  };
  uiuxAudit?: {
    alignmentIssues: boolean;
    brokenButtons: boolean;
    croppedSections: boolean;
    mobileLayoutBroken: boolean;
    overlappingContent: boolean;
    hiddenContent: boolean;
    navigationIssues: boolean;
    spacingIssues: boolean;
    issues: Array<{
      type: string;
      severity: string;
      description: string;
      element?: string;
      location?: string;
    }>;
  };
  seoScore?: number;
  responsiveScore?: number;
  uiuxScore?: number;
  mobileExperienceScore?: number;
  desktopScreenshot?: string;
  mobileScreenshot?: string;
  responsiveAuditCompleted?: boolean;

  // Business Intelligence fields
  footerAudit?: {
    copyrightDetected: boolean;
    copyrightYear: number | null;
    privacyPolicy: boolean;
    termsPage: boolean;
    footerComplete: boolean;
    footerLinks: number;
    hasContactInfo: boolean;
  };
  socialAudit?: {
    instagram: boolean;
    facebook: boolean;
    linkedin: boolean;
    twitter: boolean;
    youtube: boolean;
    whatsapp: boolean;
    socialPresenceScore: number;
    detectedLinks: string[];
  };
  contactAudit?: {
    phoneDetected: boolean;
    emailDetected: boolean;
    contactForm: boolean;
    googleMapsEmbed: boolean;
    officeAddress: boolean;
    whatsappButton: boolean;
    contactMethods: number;
  };
  trustScore?: number;
  trustScoreLevel?: 'high' | 'medium' | 'low';
  websiteFreshness?: {
    status: 'fresh' | 'moderate' | 'outdated' | 'very-outdated';
    copyrightYear: number | null;
    yearsBehind: number;
    staleCopyright: boolean;
    designGeneration: string;
    modernStandards: boolean;
  };
  businessOpportunity?: {
    level: 'low' | 'medium' | 'high';
    score: number;
    reasons: string[];
    recommendation: string;
    estimatedValue: 'low' | 'medium' | 'high';
  };
  websiteQualityScore?: number;
  socialPresenceScore?: number;
  copyrightYear?: number;
  aiRecommendation?: {
    summary: string;
    services: string[];
    priority: 'low' | 'medium' | 'high';
    estimatedImpact: string;
    keyIssues: string[];
  };
  intelligenceCompleted?: boolean;
  intelligenceAnalyzedAt?: Date;
  intelligenceAnalysisDuration?: number;
  intelligenceWebsiteHash?: string;
  websiteIntelligence?: {
    trustScore: number;
    trustScoreLevel: string;
    qualityScore: number;
    seoScore: number;
    uiScore: number;
    uxScore: number;
    performanceScore: number;
    accessibilityScore: number;
    securityScore: number;
    mobileScore: number;
    businessOpportunityScore: number;
    leadPriorityScore: number;
    issues: Array<{
      type: string;
      severity: string;
      category: string;
      description: string;
      detail: string;
      element?: string;
      recommendation: string;
    }>;
    recommendations: Array<{
      title: string;
      description: string;
      impact: string;
      effort: string;
      category: string;
    }>;
    metaAnalysis: Record<string, unknown>;
    performanceMetrics: Record<string, unknown>;
    securityDetails: Record<string, unknown>;
    seoDetails: Record<string, unknown>;
    uiDetails: Record<string, unknown>;
    contentAnalysis: Record<string, unknown>;
    categorySpecific: Record<string, unknown> | null;
    analysisDuration: number;
    analyzedAt: Date;
  };
  responsiveAuditedAt?: Date;
  desktopMetrics?: {
    hasHorizontalScroll: boolean;
    bodyOverflowX: boolean;
    elementsOffscreen: number;
    fixedWidthElements: number;
    overlappingElements: number;
  };
  mobileMetrics?: {
    hasHorizontalScroll: boolean;
    bodyOverflowX: boolean;
    elementsOffscreen: number;
    fixedWidthElements: number;
    overlappingElements: number;
  };

  // AI Sales Intelligence fields
  conversionProbability?: 'low' | 'medium' | 'high';
  websiteRedesignPotential?: 'low' | 'medium' | 'high';
  seoOpportunity?: 'low' | 'medium' | 'high';
  digitalMarketingOpportunity?: 'low' | 'medium' | 'high';
  revenuePotential?: 'low' | 'medium' | 'high' | 'enterprise';
  salesPriority?: 'low' | 'medium' | 'high' | 'urgent';
  aiInsight?: string;
  competitionLevel?: 'low' | 'medium' | 'high';
  marketOpportunity?: 'low' | 'medium' | 'high';
  salesIntelligenceCompleted?: boolean;
  salesIntelligenceAnalyzedAt?: Date;
  // AI Outreach & Proposal fields
  outreachHistory?: Array<{
    type: 'email' | 'whatsapp' | 'proposal' | 'followup';
    content: string;
    subject?: string;
    generatedAt: Date;
    status: 'pending' | 'sent' | 'opened' | 'responded';
    followUpStage?: number;
    response?: string;
  }>;
  generatedEmails?: Array<{
    type: string;
    subject: string;
    body: string;
  }>;
  generatedWhatsAppMessages?: Array<{
    type: string;
    content: string;
  }>;
  generatedProposals?: Array<{
    type: string;
    title: string;
    html: string;
    summary: string;
    services: string[];
    estimatedTimeline: string;
    estimatedInvestment: string;
  }>;
  followupSequence?: Array<{
    stage: number;
    type: 'email' | 'whatsapp';
    subject?: string;
    content: string;
    delayDays: number;
  }>;
  outreachProbability?: 'low' | 'medium' | 'high';
  outreachProbabilityScore?: number;
  lastOutreachDate?: Date;
  crmOutreachStatus?: 'outreach_pending' | 'email_sent' | 'whatsapp_sent' | 'followup_pending' | 'proposal_sent' | 'responded' | 'interested' | 'closed';
  outreachCompleted?: boolean;
  whatsappOutreach?: {
    status: 'pending' | 'prepared' | 'manually_sent' | 'skipped' | 'failed' | 'report_generated' | 'report_attached';
    lastOpenedAt: Date | null;
    lastSentAt: Date | null;
    templateType: 'website' | 'no-website' | null;
    notes: string;
    campaignId: string | null;
    lastError: string | null;
    outreachAttemptCount: number;
    queuePosition: number | null;
    reportAttachedAt: Date | null;
    reportSentAt: Date | null;
    preparedMessage?: string | null;
    messageStatus?: string | null;
    preparedAt?: string | null;
  };
  messageStatus?: string;
  preparedMessage?: string;
  campaignId?: string;
  preparedAt?: string;
  whatsappMessageLogs?: Array<{
    phone: string;
    company: string;
    hasWebsite: boolean;
    template: 'HAS_WEBSITE' | 'NO_WEBSITE';
    sentAt: Date;
    status: 'SUCCESS' | 'FAILED';
    reportSent: boolean;
  }>;

  report?: {
    generated: boolean;
    generating: boolean;
    generatedAt: Date | null;
    reportUrl: string | null;
    reportPath: string | null;
    htmlPath: string | null;
    score: number | null;
    reportVersion: string | null;
    lastAuditAt: Date | null;
    progress: {
      stage: string;
      percent: number;
      message: string;
    } | null;
    failureReason: string | null;
  };

  createdAt: Date;
  updatedAt: Date;
}

const leadSchema = new Schema<ILead>(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    website: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
    },
    address: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
    secondaryCategories: {
      type: [String],
    },
    industry: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      enum: LEAD_SOURCES,
      required: true,
    },
    sourceUrl: {
      type: String,
      trim: true,
    },
    placeId: {
      type: String,
      trim: true,
      index: true,
    },
    extractionSource: {
      type: String,
      enum: EXTRACTION_SOURCES,
    },
    sourceMetadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    semanticCategory: {
      type: String,
      trim: true,
    },
    semanticCategoryName: {
      type: String,
      trim: true,
    },
    matchedKeyword: {
      type: String,
      trim: true,
    },
    originalSearchedKeyword: {
      type: String,
      trim: true,
    },
    searchGroup: {
      type: String,
      trim: true,
    },
    semanticMatchReason: {
      type: String,
    },
    expandedFromKeyword: {
      type: String,
      trim: true,
    },
    semanticKeyword: {
      type: String,
      trim: true,
    },
    searchSessionId: {
      type: String,
      trim: true,
      index: true,
    },
    searchedKeyword: {
      type: String,
      trim: true,
    },
    searchedLocation: {
      type: String,
      trim: true,
    },
    searchedArea: {
      type: String,
      trim: true,
    },
    searchedCity: {
      type: String,
      trim: true,
    },
    searchedState: {
      type: String,
      trim: true,
    },
    searchedBusinessType: {
      type: String,
      trim: true,
    },
    searchedCountry: {
      type: String,
      trim: true,
    },
    fullSearchQuery: {
      type: String,
      trim: true,
    },
    searchRank: {
      type: Number,
    },
    sources: [{
      type: String,
    }],
    relevanceScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    validatedCategory: {
      type: String,
      trim: true,
    },
    locationConfidence: {
      type: Number,
      min: 0,
      max: 100,
    },
    categoryConfidence: {
      type: Number,
      min: 0,
      max: 100,
    },
    finalConfidence: {
      type: Number,
      min: 0,
      max: 100,
    },
    validationStatus: {
      type: String,
      enum: ['validated', 'rejected', 'needs-review'],
    },
    rejectionReason: {
      type: String,
    },
    aiMatchType: {
      type: String,
    },
    aiWarnings: [{
      type: String,
    }],
    aiQuality: {
      type: String,
      enum: ['excellent', 'good', 'average', 'poor'],
    },
    // CRM Pipeline fields
    pipelineStage: {
      type: String,
      enum: ['new-lead', 'contacted', 'interested', 'not-interested', 'follow-up', 'meeting-scheduled', 'proposal-sent', 'negotiation', 'deal-won', 'deal-lost'],
      default: 'new-lead',
    },
    assignedTo: {
      type: String,
    },
    lastContactedAt: {
      type: Date,
    },
    followUpDate: {
      type: Date,
    },
    followUpNotes: {
      type: String,
    },
    leadStatus: {
      type: String,
      enum: ['active', 'pending', 'qualified', 'disqualified'],
      default: 'active',
    },
    contactStatus: {
      type: String,
      enum: ['contacted', 'not-contacted'],
    },
    interestStatus: {
      type: String,
      enum: ['interested', 'not-interested', 'maybe-later'],
    },
    salesNotes: {
      type: String,
    },
    discussionSummary: {
      type: String,
    },
    clientBudget: {
      type: Number,
    },
    requiredServices: [{
      type: String,
    }],
    priorityLevel: {
      type: String,
      enum: ['high', 'medium', 'low'],
    },
    proposalStatus: {
      type: String,
      enum: ['pending', 'sent', 'approved', 'rejected'],
    },
    meetingStatus: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled'],
    },
    dealValue: {
      type: Number,
    },
    expectedClosingDate: {
      type: Date,
    },
    whatsappNumber: {
      type: String,
    },
    tags: [{
      type: String,
    }],
    stageUpdatedAt: {
      type: Date,
    },

    // WhatsApp Campaign fields
    normalizedPhone: {
      type: String,
    },
    isWhatsAppValid: {
      type: Boolean,
    },
    validationReason: {
      type: String,
    },
    campaignStatus: {
      type: String,
      enum: ['pending', 'preparing', 'validating', 'sending', 'completed', 'stopped', 'failed'],
    },
    lastSent: {
      type: Date,
    },
    attempts: {
      type: Number,
    },
    activityHistory: [{
      type: {
        type: String,
        timestamp: Date,
        details: String,
      },
      default: [],
    }],
    websiteStatus: {
      type: String,
      enum: WEBSITE_STATUSES,
      default: 'unknown',
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
    },
    reviewsCount: {
      type: Number,
      min: 0,
    },
    totalPhotos: {
      type: Number,
      min: 0,
    },
    pincode: {
      type: String,
      trim: true,
    },
    postalCode: {
      type: String,
      trim: true,
    },
    streetAddress: {
      type: String,
      trim: true,
    },
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
    workingHours: {
      type: String,
      trim: true,
    },
    businessStatus: {
      type: String,
      trim: true,
    },
    serviceOptions: {
      type: [String],
    },
    ownerClaimed: {
      type: Boolean,
    },
    plusCode: {
      type: String,
      trim: true,
    },
    leadScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    // AI Pipeline status fields
    aiStatus: {
      type: String,
      enum: ['pending', 'queued', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    aiProgress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    aiCurrentStep: {
      type: String,
      default: null,
    },
    aiCurrentStepIndex: {
      type: Number,
      default: 0,
    },
    aiTotalSteps: {
      type: Number,
      default: 5,
    },
    aiError: {
      type: String,
      default: null,
    },
    processingStartedAt: {
      type: Date,
      default: null,
    },
    processingCompletedAt: {
      type: Date,
      default: null,
    },
    lastAuditAt: {
      type: Date,
      default: null,
    },
    reportGenerated: {
      type: Boolean,
      default: false,
    },
    responsiveAuditReady: {
      type: Boolean,
      default: false,
    },
    intelligenceReady: {
      type: Boolean,
      default: false,
    },
    outreachReady: {
      type: Boolean,
      default: false,
    },
    salesAIReady: {
      type: Boolean,
      default: false,
    },
    reportReady: {
      type: Boolean,
      default: false,
    },
    aiWebsiteHash: {
      type: String,
      default: null,
    },

    enrichmentStatus: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed'],
      default: 'pending',
    },
    enrichmentStartedAt: {
      type: Date,
      default: null,
    },
    enrichmentCompletedAt: {
      type: Date,
      default: null,
    },
    enrichmentError: {
      type: String,
      default: null,
    },
    enrichmentProgress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    enrichmentCurrentStep: {
      type: String,
      default: null,
    },

    auditStatus: {
      type: {
        responsive: { type: String, enum: ['pending', 'running', 'completed', 'failed'], default: 'pending' },
        intelligence: { type: String, enum: ['pending', 'running', 'completed', 'failed'], default: 'pending' },
        seo: { type: String, enum: ['pending', 'running', 'completed', 'failed'], default: 'pending' },
        uiux: { type: String, enum: ['pending', 'running', 'completed', 'failed'], default: 'pending' },
        overall: { type: String, enum: ['pending', 'running', 'completed', 'failed'], default: 'pending' },
      },
      default: {},
    },
    hasRealWebsite: {
      type: Boolean,
      default: false,
    },
    hasWebsite: {
      type: Boolean,
      default: false,
    },
    websiteReachable: {
      type: Boolean,
    },
    normalizedDomain: {
      type: String,
    },
    analysisEligible: {
      type: Boolean,
      default: false,
    },
    websitePresence: {
      type: String,
      enum: ['YES', 'NO'],
    },
    detectedWebsiteType: {
      type: String,
      enum: ['STANDALONE', 'PROFILE_ONLY', 'UNKNOWN'],
    },
    socialPlatform: {
      type: String,
    },
    websiteType: {
      type: String,
      enum: ['REAL_WEBSITE', 'SOCIAL_PROFILE', 'GOOGLE_PROFILE', 'MARKETPLACE_PROFILE', 'DIRECTORY_PROFILE', 'INVALID_URL', 'NO_WEBSITE'],
    },
    websiteClassification: {
      type: String,
      enum: ['business_website', 'social_profile', 'google_business_profile', 'directory_listing', 'no_website'],
    },
    websiteAuditAllowed: {
      type: Boolean,
      default: false,
    },
    socialPlatforms: {
      type: [String],
      default: [],
    },
    primaryPlatform: {
      type: String,
    },
    verificationScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    leadTrustScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    leadDataQuality: {
      type: Number,
      min: 0,
      max: 100,
    },
    phoneVerificationStatus: {
      type: String,
      enum: ['valid', 'invalid', 'risky', 'unverified'],
      default: 'unverified',
    },
    emailVerificationStatus: {
      type: String,
      enum: ['valid', 'invalid', 'risky', 'unknown', 'unverified'],
      default: 'unverified',
    },
    websiteIntelligenceCompletedAt: {
      type: Date,
    },
    websiteMetadata: {
      type: {
        title: { type: String },
        description: { type: String },
        favicon: { type: String },
        logo: { type: String },
        language: { type: String },
        httpsEnabled: { type: Boolean },
        canonicalUrl: { type: String },
        cms: { type: String },
      },
    },
    websiteQuality: {
      type: {
        sslEnabled: { type: Boolean },
        brokenNavigation: { type: Boolean },
        contactPageStatus: { type: String, enum: ['found', 'missing', 'broken'] },
        aboutPageStatus: { type: String, enum: ['found', 'missing'] },
        servicesPageStatus: { type: String, enum: ['found', 'missing'] },
        hasContactForm: { type: Boolean },
        hasEmail: { type: Boolean },
        hasPhone: { type: Boolean },
        issues: [{ type: String }],
        score: { type: Number },
      },
      default: {},
    },
    socialLinks: {
      type: {
        instagram: { type: String },
        facebook: { type: String },
        whatsapp: { type: String },
        linkedin: { type: String },
        youtube: { type: String },
        twitter: { type: String },
        telegram: { type: String },
        snapchat: { type: String },
        pinterest: { type: String },
        linktree: { type: String },
        other: [{ type: String }],
      },
      default: {},
    },
    marketplaceLinks: {
      type: {
        justdial: { type: String },
        indiamart: { type: String },
        amazon: { type: String },
        flipkart: { type: String },
        meesho: { type: String },
        tradeindia: { type: String },
        other: [{ type: String }],
      },
      default: {},
    },
    mapsLinks: [{ type: String }],
    socialProfiles: {
      type: {
        instagram: { type: String },
        facebook: { type: String },
        linkedin: { type: String },
        youtube: { type: String },
        twitter: { type: String },
        tiktok: { type: String },
        whatsapp: { type: String },
        snapchat: { type: String },
        pinterest: { type: String },
        telegram: { type: String },
        other: [{ type: String }],
      },
      default: {},
    },
    // Analysis fields
    qualificationLevel: {
      type: String,
      enum: ['high-potential', 'medium-potential', 'low-potential'],
    },
    sslEnabled: {
      type: Boolean,
    },
    responseTime: {
      type: Number,
    },
    metaTitle: {
      type: String,
    },
    metaDescription: {
      type: String,
    },
    hasContactPage: {
      type: Boolean,
    },
    hasSocialLinks: {
      type: {
        facebook: { type: Boolean, default: false },
        instagram: { type: Boolean, default: false },
        linkedin: { type: Boolean, default: false },
        twitter: { type: Boolean, default: false },
        aiSummary: { type: String },
        aiWeaknesses: [{ type: String }],
        aiOpportunities: [{ type: String }],
      },
      default: {},
    },
    analyzedAt: {
      type: Date,
    },
    aiLeadScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    aiQualificationLevel: {
      type: String,
      enum: ['high-potential', 'medium-potential', 'low-potential'],
    },
    aiSummary: {
      type: String,
    },
    aiWeaknesses: [{
      type: String,
    }],
    aiOpportunities: [{
      type: String,
    }],
    aiAnalyzedAt: {
      type: Date,
    },
    // Responsive UI/UX Audit fields
    responsiveAudit: {
      type: {
        mobileFriendly: { type: Boolean, default: false },
        responsiveLayout: { type: Boolean, default: false },
        horizontalScroll: { type: Boolean, default: false },
        overflowIssues: { type: Boolean, default: false },
        viewportMeta: { type: Boolean, default: false },
        viewportContent: { type: String },
        touchFriendly: { type: Boolean, default: false },
        fontSizeIssues: { type: Boolean, default: false },
      },
    },
    uiuxAudit: {
      type: {
        alignmentIssues: { type: Boolean, default: false },
        brokenButtons: { type: Boolean, default: false },
        croppedSections: { type: Boolean, default: false },
        mobileLayoutBroken: { type: Boolean, default: false },
        overlappingContent: { type: Boolean, default: false },
        hiddenContent: { type: Boolean, default: false },
        navigationIssues: { type: Boolean, default: false },
        spacingIssues: { type: Boolean, default: false },
        issues: [{
          type: { type: String },
          severity: { type: String },
          description: { type: String },
          element: { type: String },
          location: { type: String },
        }],
      },
    },
    responsiveScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    uiuxScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    mobileExperienceScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    desktopScreenshot: {
      type: String,
    },
    mobileScreenshot: {
      type: String,
    },
    responsiveAuditCompleted: {
      type: Boolean,
      default: false,
    },
    responsiveAuditedAt: {
      type: Date,
    },
    seoAudit: {
      type: {
        title: { type: String },
        titleLength: { type: Number },
        titleOk: { type: Boolean },
        metaDescription: { type: String },
        metaDescriptionLength: { type: Number },
        metaDescriptionOk: { type: Boolean },
        h1Count: { type: Number },
        h1Present: { type: Boolean },
        h1Text: { type: String },
        robotsMeta: { type: String },
        canonicalUrl: { type: String },
        canonicalPresent: { type: Boolean },
        ogTitle: { type: String },
        ogDescription: { type: String },
        ogImage: { type: String },
        ogPresent: { type: Boolean },
        twitterCard: { type: String },
        twitterPresent: { type: Boolean },
        jsonLdPresent: { type: Boolean },
        jsonLdTypes: [{ type: String }],
        hasSchemaOrg: { type: Boolean },
        schemaOrgTypes: [{ type: String }],
        faviconPresent: { type: Boolean },
        score: { type: Number },
        issues: [{ type: String }],
      },
    },
    performanceAudit: {
      type: {
        loadTimeMs: { type: Number },
        domReadyMs: { type: Number },
        lcpEstimateMs: { type: Number },
        pageWeightKB: { type: Number },
        requestCount: { type: Number },
        heavyImages: { type: Number },
        largeScripts: { type: Number },
        renderBlockingResources: { type: Number },
        score: { type: Number },
        issues: [{ type: String }],
      },
    },
    websiteOpportunity: {
      type: {
        websiteExists: { type: Boolean },
        websiteMissing: { type: Boolean },
        websiteOutdated: { type: Boolean },
        noMobileOptimization: { type: Boolean },
        missingContactInfo: { type: Boolean },
        missingSeo: { type: Boolean },
        missingSocialPresence: { type: Boolean },
        noSsl: { type: Boolean },
        opportunity: { type: String, enum: ['high', 'medium', 'low'] },
        explanation: { type: String },
        recommendedServices: [{ type: String }],
      },
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
    },
    scoreReasoning: [{ type: String }],
    scoreBreakdown: {
      type: {
        websitePresence: { type: Number },
        contactInfo: { type: Number },
        responsiveScore: { type: Number },
        seoScore: { type: Number },
        socialPresence: { type: Number },
        businessStrength: { type: Number },
        websiteQuality: { type: Number },
      },
    },
    analysisTimestamp: {
      type: String,
    },
    generatedEmail: { type: String },
    generatedWhatsApp: { type: String },
    generatedCallScript: { type: String },
    generatedWebsiteProposal: { type: String },
    outreachSubject: { type: String },
    analysisReport: {
      type: Schema.Types.Mixed,
    },
    recommendations: [{ type: String }],
    responsiveStatus: {
      type: String,
      enum: ['excellent', 'good', 'average', 'poor', 'critical'],
    },
    websiteAudit: {
      type: {
        https: { type: Boolean, default: false },
        pageTitle: { type: String, default: '' },
        metaDescription: { type: String, default: '' },
        favicon: { type: String, default: '' },
        logo: { type: String, default: '' },
        contactPage: { type: String, enum: ['found', 'missing', 'broken'], default: 'missing' },
        aboutPage: { type: String, enum: ['found', 'missing'], default: 'missing' },
        servicesPage: { type: String, enum: ['found', 'missing'], default: 'missing' },
        privacyPolicy: { type: Boolean, default: false },
        terms: { type: Boolean, default: false },
        cookieBanner: { type: Boolean, default: false },
        contactForm: { type: Boolean, default: false },
        emailPresent: { type: Boolean, default: false },
        phonePresent: { type: Boolean, default: false },
        socialMedia: { type: Schema.Types.Mixed, default: {} },
        cms: { type: String, default: '' },
        detectedIssues: [{ type: String }],
        score: { type: Number, default: 0 },
      },
      default: {},
    },
    // Business Intelligence fields
    footerAudit: {
      type: {
        copyrightDetected: { type: Boolean, default: false },
        copyrightYear: { type: Number, default: null },
        privacyPolicy: { type: Boolean, default: false },
        termsPage: { type: Boolean, default: false },
        footerComplete: { type: Boolean, default: false },
        footerLinks: { type: Number, default: 0 },
        hasContactInfo: { type: Boolean, default: false },
      },
    },
    socialAudit: {
      type: {
        instagram: { type: Boolean, default: false },
        facebook: { type: Boolean, default: false },
        linkedin: { type: Boolean, default: false },
        twitter: { type: Boolean, default: false },
        youtube: { type: Boolean, default: false },
        whatsapp: { type: Boolean, default: false },
        socialPresenceScore: { type: Number, default: 0 },
        detectedLinks: [{ type: String }],
      },
    },
    contactAudit: {
      type: {
        phoneDetected: { type: Boolean, default: false },
        emailDetected: { type: Boolean, default: false },
        contactForm: { type: Boolean, default: false },
        googleMapsEmbed: { type: Boolean, default: false },
        officeAddress: { type: Boolean, default: false },
        whatsappButton: { type: Boolean, default: false },
        contactMethods: { type: Number, default: 0 },
      },
    },
    trustScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    trustScoreLevel: {
      type: String,
      enum: ['high', 'medium', 'low'],
    },
    websiteFreshness: {
      type: {
        status: { type: String, enum: ['fresh', 'moderate', 'outdated', 'very-outdated'], default: 'outdated' },
        copyrightYear: { type: Number, default: null },
        yearsBehind: { type: Number, default: 0 },
        staleCopyright: { type: Boolean, default: false },
        designGeneration: { type: String, default: 'unknown' },
        modernStandards: { type: Boolean, default: false },
      },
    },
    businessOpportunity: {
      type: {
        level: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
        score: { type: Number, default: 0 },
        reasons: [{ type: String }],
        recommendation: { type: String, default: '' },
        estimatedValue: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
      },
    },
    websiteQualityScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    socialPresenceScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    copyrightYear: {
      type: Number,
    },
    aiRecommendation: {
      type: {
        summary: { type: String, default: '' },
        services: [{ type: String }],
        priority: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
        estimatedImpact: { type: String, default: '' },
        keyIssues: [{ type: String }],
      },
    },
    intelligenceCompleted: {
      type: Boolean,
      default: false,
    },
    intelligenceAnalyzedAt: {
      type: Date,
    },
    intelligenceAnalysisDuration: {
      type: Number,
    },
    intelligenceWebsiteHash: {
      type: String,
    },
    websiteIntelligence: {
      type: {
        trustScore: { type: Number, default: 0 },
        trustScoreLevel: { type: String, default: 'low' },
        qualityScore: { type: Number, default: 0 },
        seoScore: { type: Number, default: 0 },
        uiScore: { type: Number, default: 0 },
        uxScore: { type: Number, default: 0 },
        performanceScore: { type: Number, default: 0 },
        accessibilityScore: { type: Number, default: 0 },
        securityScore: { type: Number, default: 0 },
        mobileScore: { type: Number, default: 0 },
        businessOpportunityScore: { type: Number, default: 0 },
        leadPriorityScore: { type: Number, default: 0 },
        issues: [{
          type: { type: String },
          severity: { type: String },
          category: { type: String },
          description: { type: String },
          detail: { type: String },
          element: { type: String },
          recommendation: { type: String },
        }],
        recommendations: [{
          title: { type: String },
          description: { type: String },
          impact: { type: String },
          effort: { type: String },
          category: { type: String },
        }],
        metaAnalysis: { type: Schema.Types.Mixed },
        performanceMetrics: { type: Schema.Types.Mixed },
        securityDetails: { type: Schema.Types.Mixed },
        seoDetails: { type: Schema.Types.Mixed },
        uiDetails: { type: Schema.Types.Mixed },
        contentAnalysis: { type: Schema.Types.Mixed },
        categorySpecific: { type: Schema.Types.Mixed },
        analysisDuration: { type: Number },
        analyzedAt: { type: Date },
      },
      default: null,
    },
    // AI Sales Intelligence fields
    conversionProbability: {
      type: String,
      enum: ['low', 'medium', 'high'],
    },
    websiteRedesignPotential: {
      type: String,
      enum: ['low', 'medium', 'high'],
    },
    seoOpportunity: {
      type: String,
      enum: ['low', 'medium', 'high'],
    },
    digitalMarketingOpportunity: {
      type: String,
      enum: ['low', 'medium', 'high'],
    },
    revenuePotential: {
      type: String,
      enum: ['low', 'medium', 'high', 'enterprise'],
    },
    salesPriority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
    },
    aiInsight: {
      type: String,
    },
    competitionLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
    },
    marketOpportunity: {
      type: String,
      enum: ['low', 'medium', 'high'],
    },
    salesIntelligenceCompleted: {
      type: Boolean,
      default: false,
    },
    salesIntelligenceAnalyzedAt: {
      type: Date,
    },
    // AI Outreach & Proposal fields
    outreachHistory: [{
      type: { type: String, enum: ['email', 'whatsapp', 'proposal', 'followup'] },
      content: { type: String },
      subject: { type: String },
      generatedAt: { type: Date },
      status: { type: String, enum: ['pending', 'sent', 'opened', 'responded'], default: 'pending' },
      followUpStage: { type: Number },
      response: { type: String },
    }],
    generatedEmails: [{
      type: { type: String },
      subject: { type: String },
      body: { type: String },
    }],
    generatedWhatsAppMessages: [{
      type: { type: String },
      content: { type: String },
    }],
    generatedProposals: [{
      type: { type: String },
      title: { type: String },
      html: { type: String },
      summary: { type: String },
      services: [{ type: String }],
      estimatedTimeline: { type: String },
      estimatedInvestment: { type: String },
    }],
    followupSequence: [{
      stage: { type: Number },
      type: { type: String, enum: ['email', 'whatsapp'] },
      subject: { type: String },
      content: { type: String },
      delayDays: { type: Number },
    }],
    outreachProbability: {
      type: String,
      enum: ['low', 'medium', 'high'],
    },
    outreachProbabilityScore: {
      type: Number,
    },
    lastOutreachDate: {
      type: Date,
    },
    crmOutreachStatus: {
      type: String,
      enum: ['outreach_pending', 'email_sent', 'whatsapp_sent', 'followup_pending', 'proposal_sent', 'responded', 'interested', 'closed'],
      default: 'outreach_pending',
    },
    outreachCompleted: {
      type: Boolean,
      default: false,
    },
    whatsappOutreach: {
      type: {
        status: {
          type: String,
          enum: ['pending', 'prepared', 'manually_sent', 'skipped', 'failed', 'report_generated', 'report_attached'],
          default: 'pending',
        },
        lastOpenedAt: { type: Date, default: null },
        lastSentAt: { type: Date, default: null },
        templateType: { type: String, enum: ['website', 'no-website', null], default: null },
        notes: { type: String, default: '' },
        campaignId: { type: String, default: null },
        lastError: { type: String, default: null },
        outreachAttemptCount: { type: Number, default: 0 },
        queuePosition: { type: Number, default: null },
        reportAttachedAt: { type: Date, default: null },
        reportSentAt: { type: Date, default: null },
        preparedMessage: { type: String, default: null },
        messageStatus: { type: String, default: null },
        preparedAt: { type: String, default: null },
      },
      default: { status: 'pending', notes: '', campaignId: null, lastOpenedAt: null, lastSentAt: null, templateType: null, lastError: null, outreachAttemptCount: 0, queuePosition: null, reportAttachedAt: null, reportSentAt: null, preparedMessage: null, messageStatus: null, preparedAt: null },
    },
    messageStatus: { type: String, default: null },
    preparedMessage: { type: String, default: null },
    campaignId: { type: String, default: null },
    preparedAt: { type: String, default: null },
    whatsappMessageLogs: [{
      phone: { type: String, required: true },
      company: { type: String, required: true },
      hasWebsite: { type: Boolean, required: true },
      template: { type: String, enum: ['HAS_WEBSITE', 'NO_WEBSITE'], required: true },
      sentAt: { type: Date, required: true },
      status: { type: String, enum: ['SUCCESS', 'FAILED'], required: true },
      reportSent: { type: Boolean, default: false },
    }],
    desktopMetrics: {
      type: {
        hasHorizontalScroll: { type: Boolean },
        bodyOverflowX: { type: Boolean },
        elementsOffscreen: { type: Number },
        fixedWidthElements: { type: Number },
        overlappingElements: { type: Number },
      },
    },
    mobileMetrics: {
      type: {
        hasHorizontalScroll: { type: Boolean },
        bodyOverflowX: { type: Boolean },
        elementsOffscreen: { type: Number },
        fixedWidthElements: { type: Number },
        overlappingElements: { type: Number },
      },
    },
    // Contact extraction fields
    emails: [{
      type: String,
    }],
    phones: [{
      type: String,
    }],

    // Email discovery fields
    discoveredEmails: [{
      email: { type: String, lowercase: true },
      type: { type: String, default: 'general' },
      sourcePage: { type: String, default: '/' },
      confidence: { type: Number, default: 0, min: 0, max: 100 },
      verified: { type: Boolean, default: false },
    }],
    primaryEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    emailCount: {
      type: Number,
      default: 0,
    },
    lastEmailScan: {
      type: Date,
      default: null,
    },
    emailDiscoveryStatus: {
      type: String,
      enum: ['pending', 'scanning', 'completed', 'failed', 'skipped'],
      default: 'pending',
    },
    emailDiscoveryError: {
      type: String,
      default: null,
    },
    emailDiscoveryRetries: {
      type: Number,
      default: 0,
    },

    contactPages: [{
      type: String,
    }],
    ownerNames: [{
      type: String,
    }],
    extractionStatus: {
      type: String,
      enum: ['success', 'partial', 'failed'],
    },
    extractedAt: {
      type: Date,
    },
    report: {
      type: {
        generated: { type: Boolean, default: false },
        generating: { type: Boolean, default: false },
        generatedAt: { type: Date, default: null },
        reportUrl: { type: String, default: null },
        reportPath: { type: String, default: null },
        htmlPath: { type: String, default: null },
        score: { type: Number, default: null },
        reportVersion: { type: String, default: null },
        lastAuditAt: { type: Date, default: null },
        progress: {
          type: {
            stage: { type: String, default: null },
            percent: { type: Number, default: 0 },
            message: { type: String, default: null },
          },
          default: null,
        },
        failureReason: { type: String, default: null },
      },
      default: () => ({
        generated: false,
        generating: false,
        generatedAt: null,
        reportUrl: null,
        reportPath: null,
        htmlPath: null,
        score: null,
        reportVersion: null,
        lastAuditAt: null,
        progress: null,
        failureReason: null,
      }),
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_, ret) => {
        ret.id = ret._id;
        delete (ret as any)._id;
        return ret;
      },
    },
  }
);

// Auto-audit on save is DISABLED to prevent backend freeze.
// Audits run ONLY when user explicitly clicks a tab or presses Refresh.
// This prevents cascading CPU/memory spikes from multiple audits running simultaneously.

leadSchema.index({ companyName: 1 });
leadSchema.index({ website: 1 });
leadSchema.index({ email: 1 });
leadSchema.index({ phone: 1 });
leadSchema.index({ category: 1 });
leadSchema.index({ source: 1 });
leadSchema.index({ leadStatus: 1 });
leadSchema.index({ hasWebsite: 1 });
leadSchema.index({ hasRealWebsite: 1 });
leadSchema.index({ analysisEligible: 1 });
leadSchema.index({ normalizedDomain: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ leadScore: -1 });
leadSchema.index({ finalConfidence: -1 });

leadSchema.index({ searchedState: 1, searchedCity: 1, searchedArea: 1 });
leadSchema.index({ category: 1, source: 1 });
leadSchema.index({ source: 1, createdAt: -1 });
leadSchema.index({ leadStatus: 1, aiQuality: 1 });
leadSchema.index({ hasWebsite: 1, emailDiscoveryStatus: 1 });
leadSchema.index({ companyName: 1, phone: 1 }, { unique: true, sparse: true });
leadSchema.index({ aiStatus: 1, processingStartedAt: -1 });
leadSchema.index({ enrichmentStatus: 1 });
leadSchema.index({ searchSessionId: 1, createdAt: -1 });
leadSchema.index({ phone: 1, website: 1 });
leadSchema.index({ 'sourceMetadata.placeId': 1 });
leadSchema.index({ searchedBusinessType: 1, searchedCity: 1, searchedArea: 1 });
leadSchema.index({ searchedKeyword: 1, searchedLocation: 1 });

leadSchema.pre('save', function (next) {
  if (this.isModified('website')) {
    setLeadClassificationFields(this as unknown as Record<string, unknown>, this.website);
  }
  next();
});

leadSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() as Record<string, unknown>;
  const setBlock = update?.$set as Record<string, unknown> | undefined;
  if (update?.website || setBlock?.website) {
    const website = (update.website || setBlock?.website) as string | null | undefined;
    const fields: Record<string, unknown> = {};
    setLeadClassificationFields(fields, website);
    for (const [key, value] of Object.entries(fields)) {
      this.set(key, value);
    }
  }
  next();
});

export const Lead = model<ILead>('Lead', leadSchema);
