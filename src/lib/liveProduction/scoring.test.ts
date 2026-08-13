import { describe, expect, it } from "vitest";
import { classifyTravel, computeFitScore, estimateFinancials } from "./scoring";

describe("classifyTravel", () => {
  it("classifies local / regional / extended / fly", () => {
    expect(classifyTravel(24)).toBe("local");
    expect(classifyTravel(120)).toBe("regional");
    expect(classifyTravel(300)).toBe("extended");
    expect(classifyTravel(500)).toBe("fly_date");
  });
});

describe("computeFitScore", () => {
  it("scores a strong Charlotte municipal LED job highly", () => {
    const score = computeFitScore({
      equipmentMatchPct: 92,
      crewMatchPct: 78,
      ownedCoveragePct: 85,
      estimatedValueLow: 18000,
      estimatedValueHigh: 35000,
      estimatedSubRental: 3600,
      distanceMiles: 24,
      organizationName: "City of Charlotte",
      city: "Charlotte",
      state: "NC",
      homeState: "NC",
    });
    expect(score.total).toBeGreaterThanOrEqual(80);
    expect(score.explanation.length).toBeGreaterThan(20);
  });
});

describe("estimateFinancials", () => {
  it("marks estimates and returns margin", () => {
    const est = estimateFinancials({
      valueLow: 18000,
      valueHigh: 35000,
      ownedCoveragePct: 85,
      equipmentMatchPct: 92,
      crewMatchPct: 78,
      subRentalSummary: "Staging + wireless",
    });
    expect(est.isEstimate).toBe(true);
    expect(est.estimatedGrossMarginPct).toBeDefined();
    expect(est.assumptions.length).toBeGreaterThan(0);
  });
});
