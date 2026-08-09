import { describe, expect, it } from "vitest";
import { contentPlanInputsFromIdea } from "@/lib/contentIdeas/contentPlanInputsFromIdea";
import type { ContentIdea } from "@/lib/contentIdeas/types";

describe("contentPlanInputsFromIdea", () => {
  it("maps platform, style, location, and idea text", () => {
    const idea = {
      id: "i1",
      title: "First Sip",
      hook: "Exhausted to refreshed",
      summary: "Hybrid ad for sparkling water",
      recommendedPlatform: "TikTok",
      recommendedFormat: "lifestyle_reel",
      estimatedLength: "30 sec",
      production: {
        recommendedLocation: "Kitchen",
        wardrobe: "Athleisure",
        cameraApproach: "FX3 handheld",
        suggestedLenses: "35mm",
      },
      creative: { coreIdea: "Relief in one sip", visualStyle: "cinematic ugc" },
    } as ContentIdea;

    const inputs = contentPlanInputsFromIdea(idea, {
      roughIdea: "sparkling water",
      platforms: ["TikTok"],
      contentFormats: ["lifestyle_reel"],
      toneTags: ["energetic"],
      lookTags: [],
      goals: ["awareness"],
      ideaCount: 5,
    });

    expect(inputs.platform).toBe("tiktok");
    expect(inputs.contentStyle).toBe("lifestyle");
    expect(inputs.durationSeconds).toBe(30);
    expect(inputs.energy).toBe("energetic");
    expect(inputs.location).toBe("Kitchen");
    expect(inputs.wardrobe).toBe("Athleisure");
    expect(inputs.idea).toContain("First Sip");
    expect(inputs.idea).toContain("Exhausted to refreshed");
    expect(inputs.lensesAvailable).toBe("35mm");
  });
});
