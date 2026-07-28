import { describe, expect, it } from "vitest";
import {
  buildCampaignContextLines,
  buildImgResearchQueryPlan,
  buildProfileContextLines,
  isExcludedName,
} from "@/lib/revenueOpportunities/research/buildQuery";
import type { RevenueCampaign } from "@/lib/revenueOpportunities/types/campaign";
import type { BusinessProfile } from "@/lib/revenueOpportunities/types/businessProfile";

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

function profile(fields: BusinessProfile["fields"] = {}): BusinessProfile {
  return {
    id: "p1",
    organizationCompany: "Insight Media Group LLC",
    ownerUserId: "u1",
    name: "IMG Cinematic",
    profileType: "img",
    status: "active",
    fields,
    review: { source: "manual", lastUpdatedAt: "" },
    pendingChanges: [],
    changeHistory: [],
    createdAt: "",
    updatedAt: "",
  };
}

describe("linked profile augments research", () => {
  it("adds a keyword-driven query when a profile is linked", () => {
    const withoutProfile = buildImgResearchQueryPlan(campaign());
    const withProfile = buildImgResearchQueryPlan(
      campaign(),
      profile({ keywords: ["med spa", "aesthetics"] })
    );
    expect(withProfile.length).toBe(withoutProfile.length + 1);
    expect(withProfile.some((q) => q.includes("med spa"))).toBe(true);
  });

  it("does not change queries when no profile is linked", () => {
    expect(buildImgResearchQueryPlan(campaign())).toEqual(
      buildImgResearchQueryPlan(campaign(), null)
    );
  });

  it("injects authoritative profile identity + targeting into context", () => {
    const lines = buildProfileContextLines(
      profile({
        description: "Cinematic brand films for hospitality",
        idealCustomers: ["boutique hotels", "resorts"],
        negativeKeywords: ["franchise"],
      })
    );
    const text = lines.join("\n");
    expect(text).toContain("LINKED BUSINESS PROFILE");
    expect(text).toContain("Cinematic brand films for hospitality");
    expect(text).toContain("boutique hotels");
    expect(text).toContain("franchise");
  });

  it("appends profile context to campaign context only when provided", () => {
    const base = buildCampaignContextLines(campaign());
    const withProfile = buildCampaignContextLines(campaign(), profile({ description: "X" }));
    expect(withProfile.length).toBeGreaterThan(base.length);
    expect(base.join("\n")).not.toContain("LINKED BUSINESS PROFILE");
  });
});
