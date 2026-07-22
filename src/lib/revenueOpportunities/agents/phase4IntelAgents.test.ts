import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { initRevenueAgents, listRegisteredAgents, getAgent } from "@/lib/revenueOpportunities/agents";
import { computeRulePursuit } from "@/lib/revenueOpportunities/pursuit/generatePursuit";
import { computeRuleFollowUp } from "@/lib/revenueOpportunities/followUp/generateFollowUp";
import { computeRuleSignals } from "@/lib/revenueOpportunities/signals/generateSignals";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";

function opp(overrides: Partial<RevenueOpportunity> = {}): RevenueOpportunity {
  return {
    id: "opp-1",
    organizationCompany: "Insight Media Group LLC",
    ownerUserId: "user-1",
    opportunityType: "img_client",
    subject: { name: "Test Business", industry: "Restaurants", city: "Orlando", state: "FL" },
    workflow: { pipelineStage: "review_required", technicalStatus: "completed", approvalStatus: "pending" },
    activityLog: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scoring: { totalScore: 72, confidenceScore: 68 },
    ...overrides,
  };
}

describe("computeRulePursuit", () => {
  it("recommends pursue for a strong, verified opportunity", () => {
    const p = computeRulePursuit(
      opp({ scoring: { totalScore: 88, confidenceScore: 80 }, verification: {
        status: "verified", verificationScore: 80, verifiedClaims: [], unverifiedClaims: [],
        warnings: [], sourceDomains: [], generatedAt: "", source: "rules",
      } })
    );
    expect(p.decision).toBe("pursue");
    expect(p.priority).toBe("high");
    expect(p.source).toBe("rules");
  });

  it("recommends pass for a weak opportunity", () => {
    const p = computeRulePursuit(opp({ scoring: { totalScore: 20, confidenceScore: 30 } }));
    expect(p.decision).toBe("pass");
    expect(p.steps.length).toBeGreaterThan(0);
  });

  it("holds mid-range opportunities and asks to verify", () => {
    const p = computeRulePursuit(opp({ scoring: { totalScore: 55, confidenceScore: 50 } }));
    expect(p.decision).toBe("hold");
    expect(p.steps.some((s) => /verif/i.test(s))).toBe(true);
  });
});

describe("computeRuleFollowUp", () => {
  it("is due when the follow-up date is in the past", () => {
    const past = new Date(Date.now() - 3 * 86_400_000).toISOString();
    const f = computeRuleFollowUp(opp({ workflow: { pipelineStage: "review_required", technicalStatus: "completed", approvalStatus: "pending", followUpAt: past } }));
    expect(f.due).toBe(true);
    expect(f.dueInDays).toBeLessThanOrEqual(0);
  });

  it("is not due when the follow-up date is in the future", () => {
    const future = new Date(Date.now() + 5 * 86_400_000).toISOString();
    const f = computeRuleFollowUp(opp({ workflow: { pipelineStage: "review_required", technicalStatus: "completed", approvalStatus: "pending", followUpAt: future } }));
    expect(f.due).toBe(false);
    expect(f.dueInDays).toBeGreaterThan(0);
  });

  it("prefers email when an email contact exists", () => {
    const f = computeRuleFollowUp(opp({ contact: { email: "a@b.com" } }));
    expect(f.channel).toBe("email");
  });
});

describe("computeRuleSignals", () => {
  it("surfaces previously researched why-now signals", () => {
    const s = computeRuleSignals(opp({ research: { whyNowSignals: ["Just opened a second location"] } }));
    expect(s.signals[0]?.summary).toBe("Just opened a second location");
    expect(s.timingScore).toBeGreaterThan(0);
    expect(s.source).toBe("rules");
  });

  it("returns an empty set with zero timing when nothing is on record", () => {
    const s = computeRuleSignals(opp());
    expect(s.signals).toHaveLength(0);
    expect(s.timingScore).toBe(0);
  });
});

describe("phase 4 intel agents registry + execute", () => {
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

  it("registers all five intel agents in phase 4", () => {
    const names = listRegisteredAgents().map((a) => a.name);
    for (const n of ["signal", "formal_opportunities", "brand_opportunity", "pursuit", "follow_up"]) {
      expect(names).toContain(n);
      expect(getAgent(n as never)).toBeDefined();
    }
  });

  it("pursuit agent returns a rules decision in mock mode", async () => {
    const agent = getAgent("pursuit")!;
    const result = (await agent.execute({ opportunity: opp() })) as { output: { pursuit: { source: string } } };
    expect(result.output.pursuit.source).toBe("rules");
  });
});
