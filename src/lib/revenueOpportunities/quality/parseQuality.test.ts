import { describe, expect, it } from "vitest";
import { parseQualityReviewAi } from "@/lib/revenueOpportunities/quality/parseQuality";

describe("parseQualityReviewAi", () => {
  it("parses a failed AI review", () => {
    const parsed = parseQualityReviewAi({
      status: "failed",
      issues: ["No evidence attached"],
      verificationWarnings: ["Industry not specified"],
      recommendedCorrections: ["Add a source URL"],
      confidenceScore: 40,
    });
    expect(parsed?.passed).toBe(false);
    expect(parsed?.review.source).toBe("ai");
    expect(parsed?.review.issues).toContain("No evidence attached");
  });

  it("returns null for empty junk", () => {
    expect(parseQualityReviewAi({})).toBeNull();
  });
});
