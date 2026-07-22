import type {
  AgentConfidence,
  AgentEvidence,
  RevenueApprovalStatus,
  RevenueOpportunityType,
  RevenuePipelineStage,
  RevenueRejectionReason,
  RevenueTechnicalStatus,
} from "@/lib/revenueOpportunities/types";

export interface OpportunitySubject {
  name: string;
  website?: string;
  description?: string;
  industry?: string;
  subIndustry?: string;
  city?: string;
  state?: string;
  address?: string;
  distanceMiles?: number;
  publicPhone?: string;
  publicEmail?: string;
  socialLinks?: string;
}

export interface OpportunityContact {
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  sourceUrl?: string;
  verificationStatus?: "verified" | "unverified" | "unknown";
}

/** Verification agent report (spec Part — specialized agents). Review-only. */
export interface OpportunityVerification {
  status: "verified" | "needs_review" | "unverified";
  /** 0–100 trust score based on evidence coverage and source diversity. */
  verificationScore: number;
  verifiedClaims: string[];
  unverifiedClaims: string[];
  warnings: string[];
  sourceDomains: string[];
  generatedAt: string;
  source: "rules" | "ai";
}

/** Contact agent suggestion — applied to the opportunity only on human approval. */
export interface OpportunityContactSuggestion {
  contact: OpportunityContact;
  rationale?: string;
  /** 0–1 confidence in the suggested contact. */
  confidence?: number;
  status: "pending" | "applied" | "dismissed";
  generatedAt: string;
  source: "rules" | "ai";
}

export interface OpportunityResearch {
  observedFacts?: string[];
  aiInterpretations?: string[];
  marketingGaps?: string[];
  whyNowSignals?: string[];
  growthSignals?: string[];
  risks?: string[];
  missingInformation?: string[];
}

export interface OpportunityScoring {
  totalScore: number;
  confidenceScore: number;
  categoryScores?: Record<string, number>;
  scoreReasons?: string[];
  disqualifiers?: string[];
}

export interface OpportunityRecommendation {
  serviceId?: string;
  serviceName?: string;
  estimatedMinimumValue?: number;
  estimatedMaximumValue?: number;
  rationale?: string;
  stormiInvolvement?: string;
  imgInvolvement?: string;
  witmeObjective?: string;
}

export interface CampaignConceptSummary {
  title?: string;
  campaignObjective?: string;
  targetAudience?: string;
  coreConcept?: string;
  hook?: string;
  storyDirection?: string;
  recommendedDeliverables?: string[];
  recommendedPlatforms?: string[];
  stormiRole?: string;
  imgRole?: string;
  businessValue?: string;
  creatorValue?: string;
  estimatedComplexity?: "low" | "medium" | "high";
  estimatedProductionDays?: number;
  budgetConsiderations?: string[];
  knownConstraints?: string[];
  risks?: string[];
  shootSpineProjectNotes?: string[];
}

export interface OpportunityWorkflow {
  pipelineStage: RevenuePipelineStage;
  technicalStatus: RevenueTechnicalStatus;
  approvalStatus: RevenueApprovalStatus;
  assignedTo?: string;
  nextAction?: string;
  followUpAt?: string;
}

export interface OpportunityQualityReview {
  status?: "pending" | "passed" | "failed";
  issues?: string[];
  unsupportedClaims?: string[];
  verificationWarnings?: string[];
  recommendedCorrections?: string[];
  source?: "rules" | "ai";
  reviewedAt?: string;
}

export interface OpportunityRevisionSuggestion {
  revisionNotes: string[];
  suggestedFieldUpdates: Record<string, string>;
  readyForReReview: boolean;
  source?: "rules" | "ai";
  generatedAt?: string;
}

export interface OpportunityProjectConversion {
  status?: "none" | "pending" | "converted" | "failed";
  shootSpineProjectId?: string;
  convertedAt?: string;
  convertedBy?: string;
  lastError?: string;
}

export interface OpportunityActivityEntry {
  id: string;
  type: string;
  message: string;
  userId: string;
  userDisplayName?: string;
  createdAt: string;
  metadata?: Record<string, string>;
}

export interface RevenueOpportunity {
  id: string;
  organizationCompany: string;
  ownerUserId: string;
  campaignId?: string;
  campaignName?: string;
  opportunityType: RevenueOpportunityType;
  clientId?: string;
  subject: OpportunitySubject;
  contact?: OpportunityContact;
  research?: OpportunityResearch;
  evidence?: AgentEvidence[];
  scoring?: OpportunityScoring;
  confidence?: AgentConfidence;
  recommendation?: OpportunityRecommendation;
  campaignConcept?: CampaignConceptSummary;
  workflow: OpportunityWorkflow;
  qualityReview?: OpportunityQualityReview;
  revisionSuggestion?: OpportunityRevisionSuggestion;
  verification?: OpportunityVerification;
  contactSuggestion?: OpportunityContactSuggestion;
  projectConversion?: OpportunityProjectConversion;
  rejectionReason?: RevenueRejectionReason;
  rejectionNotes?: string;
  activityLog: OpportunityActivityEntry[];
  createdAt: string;
  updatedAt: string;
}

export type RevenueOpportunityCreateInput = Omit<
  RevenueOpportunity,
  "id" | "organizationCompany" | "ownerUserId" | "activityLog" | "createdAt" | "updatedAt"
> & {
  activityLog?: OpportunityActivityEntry[];
};

export type RevenueOpportunityUpdateInput = Partial<
  Omit<RevenueOpportunity, "id" | "organizationCompany" | "ownerUserId" | "createdAt">
>;

export interface RevenueDashboardSummary {
  newOpportunities: number;
  awaitingReview: number;
  approved: number;
  outreachReady: number;
  followUpsDue: number;
  discoveryCalls: number;
  proposalsPending: number;
  won: number;
  awaitingProjectConversion: number;
  convertedToProject: number;
  estimatedPipelineValue: number;
  revenueWon: number;
  byStage: Record<string, number>;
  recentActivity: OpportunityActivityEntry[];
  /** Analytics rates (0–100), null when denominator is zero */
  totalOpportunities: number;
  approvalApproved: number;
  approvalRejected: number;
  approvalRate: number | null;
  outreachSent: number;
  replySignals: number;
  replyRate: number | null;
  aiSpendUsd: number;
}

export interface RevenueFeedbackEvent {
  id: string;
  organizationCompany: string;
  opportunityId: string;
  campaignId?: string;
  reason: RevenueRejectionReason;
  notes?: string;
  userId: string;
  createdAt: string;
}
