import { describe, expect, it, beforeEach, beforeAll, afterAll } from "vitest";
import { initRevenueAgents, listRegisteredAgents, getAgent } from "@/lib/revenueOpportunities/agents";
import { computeRuleVerification } from "@/lib/revenueOpportunities/verification/generateVerification";
import { computeRuleContactSuggestion } from "@/lib/revenueOpportunities/contacts/generateContactSuggestion";
import { verificationAgent } from "@/lib/revenueOpportunities/agents/verification";
import { contactFinderAgent } from "@/lib/revenueOpportunities/agents/contactFinder";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";

function opp(overrides: Partial<RevenueOpportunity> = {}): RevenueOpportunity {
  return {
    id: "opp-1",
    organizationCompany: "Insight Media Group LLC",
    ownerUserId: "user-1",
    opportunityType: "img_client",
    subject: {
      name: "Test Business",
      industry: "Restaurants",
      city: "Orlando",
      state: "FL",
      website: "https://testbiz.com",
    },
    workflow: {
      pipelineStage: "review_required",
      technicalStatus: "completed",
      approvalStatus: "pending",
    },
    activityLog: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    evidence: [
      {
        claim: "Has a strong social presence",
        sourceUrl: "https://testbiz.com/about",
        sourceType: "website",
        retrievedAt: new Date().toISOString(),
        confidence: 0.8,
      },
    ],
    scoring: { totalScore: 72, confidenceScore: 68 },
    ...overrides,
  };
}

describe("computeRuleVerification", () => {
  it("counts verified claims and warns about single-domain sourcing", () => {
    const v = computeRuleVerification(opp());
    expect(v.verifiedClaims).toContain("Has a strong social presence");
    expect(v.sourceDomains).toEqual(["testbiz.com"]);
    expect(v.warnings).toContain("Evidence relies on a single source domain");
    expect(v.verificationScore).toBeGreaterThan(0);
  });

  it("flags an opportunity with no evidence as unverified", () => {
    const v = computeRuleVerification(opp({ evidence: [], subject: { name: "No Evidence Co" } }));
    expect(v.status).toBe("unverified");
    expect(v.verificationScore).toBe(0);
    expect(v.warnings).toContain("No evidence attached");
    expect(v.warnings).toContain("No website found for the subject");
  });
});

describe("computeRuleContactSuggestion", () => {
  it("suggests the subject's public contact details", () => {
    const suggestion = computeRuleContactSuggestion(
      opp({ subject: { name: "Biz", publicEmail: "hello@biz.com" } })
    );
    expect(suggestion?.contact.email).toBe("hello@biz.com");
    expect(suggestion?.status).toBe("pending");
    expect(suggestion?.source).toBe("rules");
  });

  it("returns null when there is nothing to suggest", () => {
    expect(computeRuleContactSuggestion(opp({ subject: { name: "Biz" } }))).toBeNull();
  });

  it("does not re-suggest when a verified contact already exists", () => {
    const suggestion = computeRuleContactSuggestion(
      opp({
        subject: { name: "Biz", publicEmail: "hello@biz.com" },
        contact: { email: "owner@biz.com", verificationStatus: "verified" },
      })
    );
    expect(suggestion).toBeNull();
  });
});

describe("phase 4 agent registry + execute", () => {
  let priorMockAi: string | undefined;
  beforeAll(() => {
    priorMockAi = process.env.SCOUT_USE_MOCK_AI;
    process.env.SCOUT_USE_MOCK_AI = "true";
  });
  afterAll(() => {
    if (priorMockAi === undefined) delete process.env.SCOUT_USE_MOCK_AI;
    else process.env.SCOUT_USE_MOCK_AI = priorMockAi;
  });
  beforeEach(() => {
    initRevenueAgents();
  });

  it("registers the verification and contact agents in phase 4", () => {
    const agents = listRegisteredAgents();
    const names = agents.map((a) => a.name);
    expect(names).toContain("verification");
    expect(names).toContain("contact_finder");
    expect(getAgent("verification")?.instruction.role).toBe("Verification agent");
    expect(agents.find((a) => a.name === "contact_finder")?.phase).toBe(4);
  });

  it("verification agent returns a rules-based report in mock mode", async () => {
    const result = await verificationAgent.execute({ opportunity: opp() });
    expect(result.output.verification.source).toBe("rules");
    expect(["verified", "needs_review", "unverified"]).toContain(
      result.output.verification.status
    );
  });

  it("contact agent suggests public details in mock mode", async () => {
    const result = await contactFinderAgent.execute({
      opportunity: opp({ subject: { name: "Biz", publicEmail: "hello@biz.com" } }),
    });
    expect(result.output.suggestion?.contact.email).toBe("hello@biz.com");
  });
});
