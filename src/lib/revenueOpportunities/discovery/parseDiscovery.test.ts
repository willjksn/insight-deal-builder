import { describe, expect, it } from "vitest";
import {
  mockDiscoveryDebrief,
  mockDiscoveryPrep,
  parseDiscoveryDebrief,
  parseDiscoveryPrep,
} from "@/lib/revenueOpportunities/discovery/parseDiscovery";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";

const baseOpportunity = {
  id: "opp-1",
  subject: { name: "Sunset Resort", industry: "Hotels", city: "Orlando", state: "FL" },
  campaignConcept: { coreConcept: "Luxury reel series", title: "Luxury reel series" },
  recommendation: { serviceName: "Brand film package", estimatedMinimumValue: 10000 },
  research: { marketingGaps: ["No hero video"], risks: ["Seasonal budget"] },
} as RevenueOpportunity;

describe("parseDiscoveryPrep", () => {
  it("parses nested prepBrief", () => {
    const parsed = parseDiscoveryPrep({
      prepBrief: {
        summary: "Call prep summary",
        questionsToAsk: ["Budget?", "Timeline?"],
      },
    });
    expect(parsed?.summary).toBe("Call prep summary");
    expect(parsed?.questionsToAsk).toEqual(["Budget?", "Timeline?"]);
  });

  it("returns null without summary", () => {
    expect(parseDiscoveryPrep({ prepBrief: { objectives: [] } })).toBeNull();
    expect(parseDiscoveryPrep(null)).toBeNull();
  });
});

describe("parseDiscoveryDebrief", () => {
  it("parses debrief and defaults fit assessment", () => {
    const parsed = parseDiscoveryDebrief({
      debrief: {
        summary: "Strong fit",
        fitAssessment: "strong",
        clientGoals: ["Refresh brand"],
      },
    });
    expect(parsed?.summary).toBe("Strong fit");
    expect(parsed?.fitAssessment).toBe("strong");
  });

  it("parses debrief creative fields", () => {
    const parsed = parseDiscoveryDebrief({
      debrief: {
        summary: "Strong fit",
        fitAssessment: "strong",
        clientGoals: ["Refresh brand"],
        shootGoals: ["Hero film"],
        creativeMessage: "Premium trust",
        scriptSeedNotes: "Open on showroom walkthrough",
      },
    });
    expect(parsed?.shootGoals).toEqual(["Hero film"]);
    expect(parsed?.creativeMessage).toBe("Premium trust");
    expect(parsed?.scriptSeedNotes).toContain("showroom");
  });

  it("falls back to unknown fit", () => {
    const parsed = parseDiscoveryDebrief({
      debrief: { summary: "Done", fitAssessment: "invalid" },
    });
    expect(parsed?.fitAssessment).toBe("unknown");
  });
});

describe("mockDiscoveryPrep", () => {
  it("personalizes prep to opportunity", () => {
    const prep = mockDiscoveryPrep(baseOpportunity);
    expect(prep.summary).toContain("Sunset Resort");
    expect(prep.questionsToAsk.length).toBeGreaterThan(0);
  });
});

describe("mockDiscoveryDebrief", () => {
  it("reflects call notes in fit assessment", () => {
    const strong = mockDiscoveryDebrief(baseOpportunity, "They are interested and shared budget timeline.");
    expect(strong.fitAssessment).toBe("strong");
    const moderate = mockDiscoveryDebrief(baseOpportunity, "Brief intro call.");
    expect(moderate.fitAssessment).toBe("moderate");
  });
});
