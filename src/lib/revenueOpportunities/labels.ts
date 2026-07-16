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
