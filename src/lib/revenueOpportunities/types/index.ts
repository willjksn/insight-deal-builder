/** Core enums and shared types for Revenue & Opportunities — expanded in Phase 2+. */

export type RevenueCampaignType = "img_client" | "stormi_brand";

export type RevenueCampaignStatus =
  | "draft"
  | "ready"
  | "active"
  | "paused"
  | "researching"
  | "reviewing"
  | "completed"
  | "failed";

export type RevenueApprovalMode = "manual_review" | "auto_prepare";

export type RevenueOpportunityType = "img_client" | "stormi_brand";

export type RevenuePipelineStage =
  | "new"
  | "researched"
  | "review_required"
  | "approved"
  | "ready_for_outreach"
  | "contacted"
  | "follow_up_due"
  | "replied"
  | "discovery_call"
  | "proposal"
  | "negotiating"
  | "won"
  | "converted_to_project"
  | "lost"
  | "revisit_later";

export type RevenueTechnicalStatus =
  | "queued"
  | "running"
  | "partially_completed"
  | "completed"
  | "failed"
  | "retrying";

export type RevenueApprovalStatus = "pending" | "approved" | "rejected" | "revision_requested";

export type RevenueRejectionReason =
  | "poor_fit"
  | "too_small"
  | "wrong_industry"
  | "weak_budget_potential"
  | "weak_creator_fit"
  | "weak_campaign_opportunity"
  | "incorrect_information"
  | "duplicate"
  | "contact_unavailable"
  | "outside_geography"
  | "existing_relationship"
  | "brand_safety_concern"
  | "other";

export interface RevenueTenantScope {
  /** ShootSpine tenant — maps to users.company (e.g. Insight Media Group LLC) */
  organizationCompany: string;
  ownerUserId: string;
}

export interface AgentConfidence {
  confidenceScore: number;
  confidenceReasons: string[];
  assumptions: string[];
  missingInformation: string[];
}

export interface AgentEvidence {
  claim: string;
  sourceUrl: string;
  sourceTitle?: string;
  sourceType: string;
  retrievedAt: string;
  confidence: number;
}

export interface RevenueFeatureStatus {
  enabled: boolean;
  phase: number;
  version: string;
  integrations: {
    gmail: "not_configured" | "mock" | "live";
    n8n: "not_configured" | "mock" | "live";
    search: "not_configured" | "live";
    ai: "mock" | "live";
  };
}

export * from "@/lib/revenueOpportunities/types/campaign";
export * from "@/lib/revenueOpportunities/types/opportunity";
