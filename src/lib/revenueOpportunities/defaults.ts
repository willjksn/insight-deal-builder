import type { RevenueCampaignCreateInput } from "@/lib/revenueOpportunities/types/campaign";
import type { OpportunityActivityEntry } from "@/lib/revenueOpportunities/types/opportunity";
import { AppUser } from "@/lib/types";

export function emptyCampaignDraft(campaignType: "img_client" | "stormi_brand" = "img_client"): RevenueCampaignCreateInput {
  return {
    campaignType,
    name: "",
    objective: "",
    status: "draft",
    approvalMode: "manual_review",
    opportunityCountRequested: 10,
    minOpportunityScore: 70,
    minConfidenceScore: 60,
    dailyResearchLimit: 5,
    weeklyResearchLimit: 25,
    active: true,
    img: campaignType === "img_client" ? { city: "Orlando", state: "FL", radiusMiles: 35 } : undefined,
    stormi: campaignType === "stormi_brand" ? { brandCategory: "Beauty" } : undefined,
  };
}

export function newActivity(
  user: Pick<AppUser, "id" | "displayName" | "email">,
  type: string,
  message: string,
  metadata?: Record<string, string>
): OpportunityActivityEntry {
  const entry: OpportunityActivityEntry = {
    id: crypto.randomUUID(),
    type,
    message,
    userId: user.id,
    userDisplayName: user.displayName ?? user.email,
    createdAt: new Date().toISOString(),
  };
  if (metadata && Object.keys(metadata).length > 0) {
    entry.metadata = metadata;
  }
  return entry;
}
