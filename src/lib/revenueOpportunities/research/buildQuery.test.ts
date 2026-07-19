import { describe, expect, it } from "vitest";
import {
  buildImgResearchQueryPlan,
  isExcludedName,
} from "@/lib/revenueOpportunities/research/buildQuery";
import type { RevenueCampaign } from "@/lib/revenueOpportunities/types/campaign";

function campaign(partial: Partial<RevenueCampaign> = {}): RevenueCampaign {
  return {
    id: "c1",
    organizationCompany: "Insight Media Group LLC",
    ownerUserId: "u1",
    campaignType: "img_client",
    name: "Orlando hotels",
    status: "active",
    approvalMode: "manual_review",
    opportunityCountRequested: 8,
    minOpportunityScore: 55,
    minConfidenceScore: 45,
    active: true,
    img: {
      industry: "Hotels and resorts",
      city: "Orlando",
      state: "FL",
      radiusMiles: 40,
      excludedCompanies: ["Disney"],
    },
    createdAt: "",
    updatedAt: "",
    ...partial,
  };
}

describe("buildImgResearchQueryPlan", () => {
  it("returns multiple targeted queries including signals and instructions", () => {
    const plan = buildImgResearchQueryPlan(
      campaign({
        requiredSignals: ["renovation"],
        additionalInstructions: "Prefer independent boutiques",
      })
    );
    expect(plan.length).toBeGreaterThanOrEqual(4);
    expect(plan.some((q) => q.includes("Orlando"))).toBe(true);
    expect(plan.some((q) => q.includes("renovation"))).toBe(true);
    expect(plan.some((q) => q.toLowerCase().includes("boutique"))).toBe(true);
  });
});

describe("isExcludedName", () => {
  it("filters excluded companies", () => {
    expect(isExcludedName("Disney Springs Hotel", campaign())).toBe(true);
    expect(isExcludedName("Lakeview Inn", campaign())).toBe(false);
  });
});
