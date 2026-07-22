import { describe, expect, it } from "vitest";
import {
  STORMI_SCORE_WEIGHTS,
  calculateStormiOpportunityScore,
  stormiScoreThreshold,
} from "@/lib/revenueOpportunities/scoring/stormiScoring";

describe("STORMI_SCORE_WEIGHTS", () => {
  it("sums to 100", () => {
    const total = Object.values(STORMI_SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });
});

describe("calculateStormiOpportunityScore", () => {
  it("clamps each category to its weight and caps the total at 100", () => {
    const perfect = calculateStormiOpportunityScore({
      brandFit: 999,
      audienceAlignment: 999,
      creatorProgramReadiness: 999,
      productionUpside: 999,
      budgetSignals: 999,
      timingSignals: 999,
      geographicFit: 999,
      brandSafety: 999,
      contactability: 999,
    });
    expect(perfect.totalScore).toBe(100);
    expect(perfect.categoryScores.brandFit).toBe(20);
    expect(perfect.categoryScores.contactability).toBe(5);
  });

  it("ignores unknown keys and treats missing categories as zero", () => {
    const partial = calculateStormiOpportunityScore({
      brandFit: 20,
      audienceAlignment: 15,
      // uses the IMG category names by mistake — should be ignored
      contentOpportunity: 20,
    });
    expect(partial.totalScore).toBe(35);
    expect(partial.categoryScores).not.toHaveProperty("contentOpportunity");
  });
});

describe("stormiScoreThreshold", () => {
  it("maps score bands to workflow thresholds", () => {
    expect(stormiScoreThreshold(90)).toBe("high");
    expect(stormiScoreThreshold(75)).toBe("qualified");
    expect(stormiScoreThreshold(60)).toBe("review");
    expect(stormiScoreThreshold(40)).toBe("reject");
  });
});
