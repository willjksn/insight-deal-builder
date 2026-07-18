import { describe, expect, it } from "vitest";
import { parseRevisionAi } from "@/lib/revenueOpportunities/revision/parseRevision";

describe("parseRevisionAi", () => {
  it("parses notes and field updates", () => {
    const parsed = parseRevisionAi({
      revisionNotes: ["Add industry"],
      suggestedFieldUpdates: { "subject.industry": "Restaurants" },
      readyForReReview: false,
      confidenceScore: 60,
    });
    expect(parsed?.suggestion.revisionNotes).toEqual(["Add industry"]);
    expect(parsed?.suggestion.suggestedFieldUpdates["subject.industry"]).toBe("Restaurants");
    expect(parsed?.suggestion.source).toBe("ai");
  });

  it("returns null when empty", () => {
    expect(parseRevisionAi({ revisionNotes: [], suggestedFieldUpdates: {} })).toBeNull();
  });
});
