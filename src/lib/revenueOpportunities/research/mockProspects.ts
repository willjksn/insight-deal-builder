import type { RevenueCampaign } from "@/lib/revenueOpportunities/types/campaign";
import type { ParsedResearchProspect } from "@/lib/revenueOpportunities/research/parseResearch";

/** Deterministic prospects when Tavily/Gemini unavailable (SCOUT_USE_MOCK_AI or no API key). */
export function mockProspectsForCampaign(campaign: RevenueCampaign): ParsedResearchProspect[] {
  const city = campaign.img?.city ?? "Orlando";
  const state = campaign.img?.state ?? "FL";
  const industry = campaign.img?.industry ?? campaign.stormi?.brandCategory ?? "Local business";

  if (campaign.campaignType === "stormi_brand") {
    return [
      mockProspect(`${industry} Collective`, industry, city, state, 78, campaign.name),
      mockProspect("Aura Skin Studio", "Skincare", "Winter Park", "FL", 74, campaign.name),
    ];
  }

  return [
    mockProspect(`Premier ${industry.split(" ")[0] ?? "Local"} Group`, industry, city, state, 82, campaign.name),
    mockProspect("Harbor & Hearth Kitchen", "Restaurants", city, state, 76, campaign.name),
    mockProspect("Glow Med Spa", "Medical spas", "Winter Park", "FL", 71, campaign.name),
  ].slice(0, Math.min(3, campaign.opportunityCountRequested));
}

function mockProspect(
  name: string,
  industry: string,
  city: string,
  state: string,
  totalScore: number,
  campaignName: string
): ParsedResearchProspect {
  const categoryScores = {
    contentOpportunity: Math.min(20, Math.round(totalScore * 0.22)),
    socialMarketingActivity: Math.min(15, Math.round(totalScore * 0.16)),
    purchasingPotential: Math.min(15, Math.round(totalScore * 0.17)),
    recurringContentPotential: Math.min(15, Math.round(totalScore * 0.16)),
    recentBusinessSignals: Math.min(10, Math.round(totalScore * 0.1)),
    creativeCinematicFit: Math.min(10, Math.round(totalScore * 0.11)),
    geographicServiceability: 5,
    stormiIntegrationPotential: Math.min(5, Math.round(totalScore * 0.04)),
    contactability: 4,
  };

  return {
    subject: {
      name,
      industry,
      city,
      state,
      description: `Mock research prospect for campaign "${campaignName}" (enable Tavily + Gemini for live results).`,
      website: "https://example.com",
    },
    research: {
      observedFacts: ["Mock mode — replace with live Tavily research"],
      marketingGaps: ["Video content appears limited vs. competitors"],
      whyNowSignals: ["Seasonal marketing push likely"],
    },
    categoryScores,
    scoreReasons: ["Mock scoring for development"],
    campaignConcept: {
      title: `${name} — cinematic refresh`,
      coreConcept: "Premium short-form video showcasing signature customer experience",
      recommendedDeliverables: ["3 hero reels", "15 photos"],
      recommendedPlatforms: ["Instagram", "TikTok"],
      estimatedComplexity: "medium",
      estimatedProductionDays: 1,
    },
    evidence: [
      {
        claim: "Public web presence identified (mock)",
        sourceUrl: "https://example.com",
        sourceTitle: "Example source",
        sourceType: "website",
        retrievedAt: new Date().toISOString(),
        confidence: 0.5,
      },
    ],
    scoring: {
      totalScore,
      confidenceScore: totalScore - 8,
      categoryScores,
      scoreReasons: ["Mock mode"],
    },
  };
}
