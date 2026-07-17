import type { RevenuePipelineStage, RevenueRejectionReason } from "@/lib/revenueOpportunities/types";

export const PIPELINE_STAGE_LABELS: Record<RevenuePipelineStage, string> = {
  new: "New",
  researched: "Researched",
  review_required: "Review required",
  approved: "Approved",
  ready_for_outreach: "Ready for outreach",
  contacted: "Contacted",
  follow_up_due: "Follow-up due",
  replied: "Replied",
  discovery_call: "Discovery call",
  proposal: "Proposal",
  negotiating: "Negotiating",
  won: "Won",
  converted_to_project: "Converted to project",
  lost: "Lost",
  revisit_later: "Revisit later",
};

export const REJECTION_REASON_LABELS: Record<RevenueRejectionReason, string> = {
  poor_fit: "Poor fit",
  too_small: "Too small",
  wrong_industry: "Wrong industry",
  weak_budget_potential: "Weak budget potential",
  weak_creator_fit: "Weak creator fit",
  weak_campaign_opportunity: "Weak campaign opportunity",
  incorrect_information: "Incorrect information",
  duplicate: "Duplicate",
  contact_unavailable: "Contact unavailable",
  outside_geography: "Outside geography",
  existing_relationship: "Existing relationship",
  brand_safety_concern: "Brand safety concern",
  other: "Other",
};

export const IMG_INDUSTRY_OPTIONS = [
  "Hotels and resorts",
  "Restaurants",
  "Beauty and skincare",
  "Boutiques",
  "Realtors",
  "Property developers",
  "Automotive",
  "Medical spas",
  "Fitness",
  "Event venues",
  "Regional consumer brands",
  "Professional services",
  "Custom industry",
];

export const STORMI_CATEGORY_OPTIONS = [
  "Beauty",
  "Skincare",
  "Fashion",
  "Apparel",
  "Swimwear",
  "Fitness",
  "Wellness",
  "Lifestyle",
  "Travel",
  "Hotels",
  "Restaurants",
  "Automotive",
  "Home",
  "Consumer products",
  "Local experiences",
  "Regional brands",
  "Custom category",
];

export function pipelineStageLabel(stage: RevenuePipelineStage): string {
  return PIPELINE_STAGE_LABELS[stage] ?? stage;
}

export function scorePriorityLabel(totalScore: number): string {
  if (totalScore >= 85) return "High priority";
  if (totalScore >= 70) return "Qualified";
  if (totalScore >= 55) return "Human review";
  return "Below threshold";
}

export const OUTREACH_CHANNEL_LABELS = {
  email: "Email",
  linkedin_dm: "LinkedIn DM",
  instagram_dm: "Instagram DM",
} as const;

export const OUTREACH_STATUS_LABELS = {
  draft: "Draft",
  pending_review: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
  sent: "Gmail draft created",
} as const;

export const PROPOSAL_STATUS_LABELS = {
  draft: "Draft",
  review: "In review",
  approved: "Approved",
  sent: "Sent",
  archived: "Archived",
} as const;

export const DISCOVERY_SESSION_STATUS_LABELS = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
} as const;

export const EMAIL_CLASSIFICATION_LABELS = {
  interested: "Interested",
  question: "Question",
  not_interested: "Not interested",
  out_of_office: "Out of office",
  referral: "Referral",
  scheduling: "Scheduling",
  spam: "Spam",
  unknown: "Unknown",
} as const;
