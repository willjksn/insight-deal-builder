import { describe, expect, it } from "vitest";
import { shouldMarkOpportunityWon } from "@/lib/revenueOpportunities/server/agreementLink";

describe("shouldMarkOpportunityWon", () => {
  it("marks won from active pipeline stages", () => {
    for (const stage of ["new", "proposal", "negotiating", "discovery_call"] as const) {
      expect(shouldMarkOpportunityWon(stage)).toBe(true);
    }
  });

  it("does not regress terminal or already-won stages", () => {
    for (const stage of ["won", "converted_to_project", "lost"] as const) {
      expect(shouldMarkOpportunityWon(stage)).toBe(false);
    }
  });
});
