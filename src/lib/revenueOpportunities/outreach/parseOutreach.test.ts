import { describe, expect, it } from "vitest";
import { mockOutreachDrafts, parseOutreachDrafts } from "@/lib/revenueOpportunities/outreach/parseOutreach";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";

const baseOpportunity = {
  id: "opp-1",
  subject: { name: "Sunset Resort", industry: "Hotels", city: "Orlando", state: "FL" },
  contact: { name: "Alex", email: "alex@sunset.com" },
  campaignConcept: { coreConcept: "Luxury reel series" },
} as RevenueOpportunity;

describe("parseOutreachDrafts", () => {
  it("parses valid draft items and skips invalid channels", () => {
    const parsed = parseOutreachDrafts({
      drafts: [
        { channel: "email", subject: "Hello", body: "Email body" },
        { channel: "invalid", body: "skip me" },
        { channel: "linkedin_dm", body: "LinkedIn text" },
        { channel: "instagram_dm", body: "" },
      ],
    });
    expect(parsed).toHaveLength(2);
    expect(parsed[0].channel).toBe("email");
    expect(parsed[1].channel).toBe("linkedin_dm");
  });

  it("returns empty array for malformed input", () => {
    expect(parseOutreachDrafts(null)).toEqual([]);
    expect(parseOutreachDrafts({ drafts: "nope" })).toEqual([]);
  });
});

describe("mockOutreachDrafts", () => {
  it("returns three channel drafts personalized to the opportunity", () => {
    const drafts = mockOutreachDrafts(baseOpportunity);
    expect(drafts).toHaveLength(3);
    expect(drafts.map((d) => d.channel)).toEqual(["email", "linkedin_dm", "instagram_dm"]);
    expect(drafts[0].body).toContain("Sunset Resort");
    expect(drafts[0].recipientEmail).toBe("alex@sunset.com");
  });
});
