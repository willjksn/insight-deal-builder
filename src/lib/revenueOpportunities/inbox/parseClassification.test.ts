import { describe, expect, it } from "vitest";
import { mockEmailClassification, parseEmailClassification } from "@/lib/revenueOpportunities/inbox/parseClassification";

describe("parseEmailClassification", () => {
  it("parses valid classification JSON", () => {
    const result = parseEmailClassification({
      classification: "scheduling",
      summary: "Wants a call",
      suggestedReply: "Thursday works",
      confidenceScore: 80,
    });
    expect(result.classification).toBe("scheduling");
    expect(result.summary).toBe("Wants a call");
    expect(result.confidenceScore).toBe(80);
  });

  it("falls back to unknown for invalid classification", () => {
    const result = parseEmailClassification({ classification: "maybe", summary: "x" });
    expect(result.classification).toBe("unknown");
  });
});

describe("mockEmailClassification", () => {
  it("detects scheduling intent", () => {
    const result = mockEmailClassification("Re: idea", "Could we schedule a call Thursday?");
    expect(result.classification).toBe("scheduling");
  });
});
