import { describe, expect, it } from "vitest";
import {
  confidenceFromEvidence,
  parseDiscoverCandidates,
  parseResearchProspects,
} from "@/lib/revenueOpportunities/research/parseResearch";

describe("parseDiscoverCandidates", () => {
  it("parses shortlist candidates", () => {
    const list = parseDiscoverCandidates({
      candidates: [
        {
          name: "Lakeview Spa",
          website: "https://lakeviewspa.example",
          city: "Orlando",
          state: "FL",
          whyInteresting: "Renovating and weak video",
          sourceUrls: ["https://lakeviewspa.example/about"],
        },
      ],
    });
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("Lakeview Spa");
    expect(list[0].website).toContain("lakeviewspa");
  });
});

describe("confidenceFromEvidence", () => {
  it("rewards evidence and contactability over raw score alone", () => {
    const thin = confidenceFromEvidence({
      totalScore: 80,
      evidenceCount: 0,
      hasWebsite: false,
      hasContact: false,
      factCount: 0,
      whyNowCount: 0,
    });
    const solid = confidenceFromEvidence({
      totalScore: 70,
      evidenceCount: 4,
      hasWebsite: true,
      hasContact: true,
      factCount: 4,
      whyNowCount: 2,
    });
    expect(solid).toBeGreaterThan(thin);
    expect(solid).toBeGreaterThanOrEqual(70);
  });
});

describe("parseResearchProspects", () => {
  it("builds confidence from evidence density", () => {
    const prospects = parseResearchProspects({
      prospects: [
        {
          subject: { name: "Acme Hotel", website: "https://acme.example", city: "Orlando", state: "FL" },
          research: {
            observedFacts: ["Boutique hotel downtown", "Active Instagram"],
            marketingGaps: ["No cinematic video"],
            whyNowSignals: ["Lobby renovation 2026"],
            risks: ["Seasonal"],
          },
          categoryScores: {
            contentOpportunity: 16,
            socialMarketingActivity: 10,
            purchasingPotential: 10,
            recurringContentPotential: 10,
            recentBusinessSignals: 8,
            creativeCinematicFit: 8,
            geographicServiceability: 5,
            stormiIntegrationPotential: 2,
            contactability: 2,
          },
          scoreReasons: ["Renovation", "Weak video"],
          evidence: [
            {
              claim: "Lobby renovation announced",
              sourceUrl: "https://acme.example/news",
              sourceTitle: "News",
              sourceType: "press",
              confidence: 0.9,
            },
          ],
        },
      ],
    });
    expect(prospects).toHaveLength(1);
    expect(prospects[0].scoring.confidenceScore).toBeGreaterThan(40);
  });
});
