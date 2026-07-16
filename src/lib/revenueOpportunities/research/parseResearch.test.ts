import { describe, expect, it } from "vitest";
import { parseResearchProspects } from "@/lib/revenueOpportunities/research/parseResearch";

describe("parseResearchProspects", () => {
  it("parses valid prospect payload and computes scores", () => {
    const result = parseResearchProspects({
      prospects: [
        {
          subject: { name: "Test Hotel", industry: "Hotels", city: "Orlando", state: "FL" },
          categoryScores: {
            contentOpportunity: 18,
            socialMarketingActivity: 12,
            purchasingPotential: 12,
            recurringContentPotential: 10,
            recentBusinessSignals: 8,
            creativeCinematicFit: 8,
            geographicServiceability: 5,
            stormiIntegrationPotential: 3,
            contactability: 4,
          },
          evidence: [
            {
              claim: "Website lists amenities",
              sourceUrl: "https://example.com/hotel",
              sourceTitle: "Hotel site",
              sourceType: "website",
              confidence: 0.8,
            },
          ],
        },
      ],
    });

    expect(result).toHaveLength(1);
    expect(result[0].subject.name).toBe("Test Hotel");
    expect(result[0].scoring.totalScore).toBeGreaterThan(50);
    expect(result[0].evidence).toHaveLength(1);
  });

  it("skips prospects without subject name", () => {
    const result = parseResearchProspects({
      prospects: [{ subject: { industry: "Hotels" } }],
    });
    expect(result).toHaveLength(0);
  });
});
