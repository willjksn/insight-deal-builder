import { describe, expect, it, beforeEach } from "vitest";
import { initRevenueAgents, listRegisteredAgents, getAgent } from "@/lib/revenueOpportunities/agents";
import { qualityReviewAgent } from "@/lib/revenueOpportunities/agents/qualityReview";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";

function minimalOpportunity(overrides: Partial<RevenueOpportunity> = {}): RevenueOpportunity {
  return {
    id: "opp-1",
    organizationCompany: "Insight Media Group LLC",
    ownerUserId: "user-1",
    opportunityType: "img_client",
    subject: { name: "Test Business", industry: "Restaurants", city: "Orlando", state: "FL" },
    workflow: {
      pipelineStage: "review_required",
      technicalStatus: "completed",
      approvalStatus: "pending",
    },
    activityLog: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    evidence: [{ claim: "Has social presence", sourceUrl: "https://example.com", sourceType: "website", retrievedAt: new Date().toISOString(), confidence: 0.8 }],
    scoring: { totalScore: 72, confidenceScore: 68 },
    ...overrides,
  };
}

describe("revenue agent registry", () => {
  beforeEach(() => {
    initRevenueAgents();
  });

  it("registers quality review and revision agents", () => {
    const agents = listRegisteredAgents();
    expect(agents.some((a) => a.name === "quality_review")).toBe(true);
    expect(agents.some((a) => a.name === "revision")).toBe(true);
    expect(getAgent("quality_review")?.version).toBeTruthy();
  });
});

describe("qualityReviewAgent stub", () => {
  it("passes when evidence and scores are present", async () => {
    const result = await qualityReviewAgent.execute({ opportunity: minimalOpportunity() });
    expect(result.output.passed).toBe(true);
    expect(result.output.review.status).toBe("passed");
  });

  it("fails when evidence is missing", async () => {
    const result = await qualityReviewAgent.execute({
      opportunity: minimalOpportunity({ evidence: [], scoring: { totalScore: 40, confidenceScore: 40 } }),
    });
    expect(result.output.passed).toBe(false);
    expect(result.output.review.issues).toContain("No evidence attached");
  });
});
