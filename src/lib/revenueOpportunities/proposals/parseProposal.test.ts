import { describe, expect, it } from "vitest";
import { mockProposalDraft, parseProposalDraft } from "@/lib/revenueOpportunities/proposals/parseProposal";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";

const baseOpportunity = {
  id: "opp-1",
  subject: { name: "Sunset Resort", industry: "Hotels", city: "Orlando", state: "FL" },
  campaignConcept: {
    title: "Luxury reel series",
    recommendedDeliverables: ["Hero film", "Social cuts"],
  },
  recommendation: { estimatedMinimumValue: 12000, estimatedMaximumValue: 18000 },
} as RevenueOpportunity;

const validDraft = {
  title: "Proposal title",
  executiveSummary: "Executive summary text",
  scopeOutline: "Scope outline text",
  deliverables: ["Hero film"],
  investmentMin: 10000,
  investmentMax: 15000,
  agreementPrefill: {
    suggestedTitle: "Sunset — Luxury reel",
    projectOverview: "Overview for Sunset Resort",
    deliverables: ["Hero film"],
    estimatedFee: 12500,
  },
};

describe("parseProposalDraft", () => {
  it("parses a complete proposal draft bundle", () => {
    const parsed = parseProposalDraft(validDraft);
    expect(parsed?.title).toBe("Proposal title");
    expect(parsed?.agreementPrefill.suggestedTitle).toBe("Sunset — Luxury reel");
    expect(parsed?.investmentMin).toBe(10000);
  });

  it("returns null when agreement prefill is incomplete", () => {
    expect(parseProposalDraft({ ...validDraft, agreementPrefill: { suggestedTitle: "Only title" } })).toBeNull();
    expect(parseProposalDraft(null)).toBeNull();
  });
});

describe("mockProposalDraft", () => {
  it("builds draft from opportunity and optional debrief", () => {
    const draft = mockProposalDraft(baseOpportunity, {
      summary: "Client wants Q3 launch",
      fitAssessment: "strong",
      clientGoals: [],
      objections: [],
      followUpActions: [],
      proposalRecommendation: "Phased delivery",
    });
    expect(draft.title).toContain("Sunset Resort");
    expect(draft.agreementPrefill.estimatedFee).toBeGreaterThan(0);
    expect(draft.agreementPrefill.scopeNotes).toBe("Phased delivery");
  });
});
