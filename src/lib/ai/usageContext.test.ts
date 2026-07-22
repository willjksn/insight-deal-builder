import { describe, expect, it } from "vitest";
import { inferFeatureFromPath } from "@/lib/ai/usageContext";

describe("inferFeatureFromPath — revenue attribution", () => {
  it("maps specific revenue AI endpoints", () => {
    expect(inferFeatureFromPath("/api/revenue/meetings/abc/transcribe")).toBe(
      "revenue.meeting.transcribe"
    );
    expect(inferFeatureFromPath("/api/revenue/meetings/abc/analyze")).toBe("revenue.meeting.analyze");
    expect(inferFeatureFromPath("/api/revenue/business-profiles/p1/draft")).toBe(
      "revenue.profile.draft"
    );
    expect(inferFeatureFromPath("/api/revenue/opportunities/o1/verify")).toBe("revenue.verify");
    expect(inferFeatureFromPath("/api/revenue/opportunities/o1/find-contact")).toBe("revenue.contact");
    expect(inferFeatureFromPath("/api/revenue/campaigns/c1/research")).toBe("revenue.research");
  });

  it("tolerates a trailing slash", () => {
    expect(inferFeatureFromPath("/api/revenue/opportunities/o1/verify/")).toBe("revenue.verify");
  });

  it("falls back to revenue.other for unlisted revenue endpoints", () => {
    expect(inferFeatureFromPath("/api/revenue/opportunities/o1/approve")).toBe("revenue.other");
    expect(inferFeatureFromPath("/api/revenue/dashboard")).toBe("revenue.other");
  });

  it("keeps existing non-revenue behavior", () => {
    expect(inferFeatureFromPath("/api/agreements/suggest-scope")).toBe("agreements.scope");
    expect(inferFeatureFromPath("/api/something-else")).toBe("api.other");
    expect(inferFeatureFromPath("/dashboard")).toBe("unknown");
  });
});
