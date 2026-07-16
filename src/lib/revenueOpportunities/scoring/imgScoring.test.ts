import { describe, expect, it } from "vitest";
import {
  calculateImgOpportunityScore,
  imgScoreThreshold,
} from "@/lib/revenueOpportunities/scoring/imgScoring";

describe("calculateImgOpportunityScore", () => {
  it("sums weighted category scores capped at 100", () => {
    const high = calculateImgOpportunityScore({
      contentOpportunity: 25,
      socialMarketingActivity: 20,
      purchasingPotential: 20,
      recurringContentPotential: 20,
      recentBusinessSignals: 15,
      creativeCinematicFit: 15,
      geographicServiceability: 10,
      stormiIntegrationPotential: 10,
      contactability: 10,
    });
    expect(high.totalScore).toBe(100);

    const low = calculateImgOpportunityScore({
      contentOpportunity: 5,
      socialMarketingActivity: 3,
      purchasingPotential: 4,
      recurringContentPotential: 2,
      recentBusinessSignals: 1,
      creativeCinematicFit: 2,
      geographicServiceability: 1,
      stormiIntegrationPotential: 0,
      contactability: 1,
    });
    expect(low.totalScore).toBeLessThan(55);
  });
});

describe("imgScoreThreshold", () => {
  it("maps score bands to workflow thresholds", () => {
    expect(imgScoreThreshold(90)).toBe("high");
    expect(imgScoreThreshold(75)).toBe("qualified");
    expect(imgScoreThreshold(60)).toBe("review");
    expect(imgScoreThreshold(40)).toBe("reject");
  });
});
