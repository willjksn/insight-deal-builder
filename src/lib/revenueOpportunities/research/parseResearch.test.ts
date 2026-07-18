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

  it("parses website and socialLinks from subject", () => {
    const result = parseResearchProspects({
      prospects: [
        {
          subject: {
            name: "Glow Spa",
            website: "glowspa.com",
            socialLinks: {
              Instagram: "@glowspa",
              TikTok: "https://tiktok.com/@glowspa",
            },
          },
          categoryScores: { contentOpportunity: 15 },
          evidence: [],
        },
      ],
    });

    expect(result).toHaveLength(1);
    expect(result[0].subject.website).toBe("https://glowspa.com");
    expect(result[0].subject.socialLinks).toContain("Instagram: @glowspa");
    expect(result[0].subject.socialLinks).toContain("TikTok:");
  });

  it("drops schema placeholder website/social values", () => {
    const result = parseResearchProspects({
      prospects: [
        {
          subject: {
            name: "Bad Placeholder Co",
            website: "string optional",
            socialLinks: "string optional",
          },
          categoryScores: {},
          evidence: [],
        },
      ],
    });

    expect(result[0].subject.website).toBeUndefined();
    expect(result[0].subject.socialLinks).toBeUndefined();
  });
});
