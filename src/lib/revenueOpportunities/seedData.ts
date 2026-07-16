import type { RevenueCampaignCreateInput } from "@/lib/revenueOpportunities/types/campaign";
import type { RevenueOpportunityCreateInput } from "@/lib/revenueOpportunities/types/opportunity";
import { calculateImgOpportunityScore } from "@/lib/revenueOpportunities/scoring/imgScoring";

export const SEED_IMG_CAMPAIGN: RevenueCampaignCreateInput = {
  campaignType: "img_client",
  name: "Orlando hospitality & wellness — Q3 prospecting",
  objective: "Find hotels, med spas, and boutique restaurants within 35 miles of Orlando that need cinematic content.",
  status: "active",
  approvalMode: "manual_review",
  opportunityCountRequested: 12,
  minOpportunityScore: 70,
  minConfidenceScore: 60,
  dailyResearchLimit: 5,
  weeklyResearchLimit: 20,
  active: true,
  img: {
    industry: "Hotels and resorts",
    city: "Orlando",
    state: "FL",
    radiusMiles: 35,
    serviceToPromote: "Business Brand Package",
    minimumProjectValue: 3500,
    recurringContentPreference: true,
    stormiIntegrationAllowed: true,
  },
};

function imgOpp(
  partial: Omit<RevenueOpportunityCreateInput, "opportunityType" | "workflow"> & {
    categoryScores: Record<string, number>;
    pipelineStage: RevenueOpportunityCreateInput["workflow"]["pipelineStage"];
    approvalStatus?: RevenueOpportunityCreateInput["workflow"]["approvalStatus"];
  }
): RevenueOpportunityCreateInput {
  const { categoryScores, pipelineStage, approvalStatus, ...rest } = partial;
  const { totalScore, categoryScores: normalized } = calculateImgOpportunityScore(categoryScores);
  return {
    opportunityType: "img_client",
    ...rest,
    scoring: {
      totalScore,
      confidenceScore: Math.min(95, totalScore - 5),
      categoryScores: normalized,
      scoreReasons: [
        "Strong visual marketing gap vs. local competitors",
        "Recent expansion or renovation signals",
        "Geographic fit for IMG crew",
      ],
    },
    confidence: {
      confidenceScore: Math.min(92, totalScore - 8),
      confidenceReasons: ["Public website and social presence reviewed"],
      assumptions: ["Budget inferred from business size and category"],
      missingInformation: ["Decision-maker email not verified"],
    },
    recommendation: {
      serviceName: "Business Brand Package",
      estimatedMinimumValue: 4500,
      estimatedMaximumValue: 8500,
      rationale: "Multi-location visual refresh with reels + hero photos; retainer potential.",
      stormiInvolvement: "Optional creator-led lifestyle clips for social",
      imgInvolvement: "Full production, editing, and content strategy",
    },
    campaignConcept: {
      title: `${rest.subject.name} — cinematic brand refresh`,
      campaignObjective: "Elevate perceived quality and drive bookings through premium short-form video",
      targetAudience: "Affluent locals and visitors seeking premium experiences",
      coreConcept: "Day-in-the-life cinematic tour highlighting signature experiences",
      hook: "Open on a detail shot that signals luxury, then reveal the full experience",
      recommendedDeliverables: ["3 hero reels", "15 edited photos", "1 horizontal brand film"],
      recommendedPlatforms: ["Instagram", "TikTok", "Website hero"],
      estimatedComplexity: "medium",
      estimatedProductionDays: 1,
    },
    workflow: {
      pipelineStage,
      technicalStatus: "completed",
      approvalStatus: approvalStatus ?? (pipelineStage === "review_required" ? "pending" : "approved"),
      nextAction:
        pipelineStage === "review_required"
          ? "Review opportunity"
          : pipelineStage === "ready_for_outreach"
            ? "Prepare outreach draft"
            : "Track in pipeline",
    },
  };
}

export function buildSeedOpportunities(campaignId: string, campaignName: string): RevenueOpportunityCreateInput[] {
  return [
    imgOpp({
      campaignId,
      campaignName,
      subject: {
        name: "The Celeste Hotel & Spa",
        website: "https://example.com/celeste-hotel",
        industry: "Hotels and resorts",
        city: "Orlando",
        state: "FL",
        description: "Boutique lakefront hotel with spa, rooftop bar, and event spaces.",
      },
      contact: { name: "Marketing Director", title: "Director of Marketing", verificationStatus: "unverified" },
      research: {
        observedFacts: ["Instagram posts are phone-quality", "Recent TripAdvisor reviews mention 'beautiful property'"],
        marketingGaps: ["No cinematic hero video on homepage", "Inconsistent reel cadence"],
        whyNowSignals: ["Seasonal package launch next month"],
      },
      categoryScores: {
        contentOpportunity: 18,
        socialMarketingActivity: 12,
        purchasingPotential: 14,
        recurringContentPotential: 13,
        recentBusinessSignals: 9,
        creativeCinematicFit: 9,
        geographicServiceability: 5,
        stormiIntegrationPotential: 4,
        contactability: 4,
      },
      pipelineStage: "review_required",
    }),
    imgOpp({
      campaignId,
      campaignName,
      subject: {
        name: "Glow Med Spa Winter Park",
        website: "https://example.com/glow-medspa",
        industry: "Medical spas",
        city: "Winter Park",
        state: "FL",
        description: "Medical aesthetics clinic with strong local following.",
      },
      categoryScores: {
        contentOpportunity: 17,
        socialMarketingActivity: 14,
        purchasingPotential: 12,
        recurringContentPotential: 14,
        recentBusinessSignals: 8,
        creativeCinematicFit: 8,
        geographicServiceability: 5,
        stormiIntegrationPotential: 5,
        contactability: 3,
      },
      pipelineStage: "ready_for_outreach",
      approvalStatus: "approved",
    }),
    imgOpp({
      campaignId,
      campaignName,
      subject: {
        name: "Harbor & Hearth Kitchen",
        website: "https://example.com/harbor-hearth",
        industry: "Restaurants",
        city: "Lake Nona",
        state: "FL",
        description: "New American restaurant in Lake Nona Town Center.",
      },
      categoryScores: {
        contentOpportunity: 16,
        socialMarketingActivity: 11,
        purchasingPotential: 11,
        recurringContentPotential: 10,
        recentBusinessSignals: 10,
        creativeCinematicFit: 9,
        geographicServiceability: 5,
        stormiIntegrationPotential: 3,
        contactability: 4,
      },
      pipelineStage: "discovery_call",
      approvalStatus: "approved",
    }),
    imgOpp({
      campaignId,
      campaignName,
      subject: {
        name: "Summit Auto Gallery",
        website: "https://example.com/summit-auto",
        industry: "Automotive",
        city: "Sanford",
        state: "FL",
        description: "Independent luxury auto dealer.",
      },
      categoryScores: {
        contentOpportunity: 12,
        socialMarketingActivity: 8,
        purchasingPotential: 10,
        recurringContentPotential: 6,
        recentBusinessSignals: 5,
        creativeCinematicFit: 7,
        geographicServiceability: 4,
        stormiIntegrationPotential: 2,
        contactability: 3,
      },
      pipelineStage: "review_required",
    }),
    imgOpp({
      campaignId,
      campaignName,
      subject: {
        name: "Velvet & Vine Boutique",
        website: "https://example.com/velvet-vine",
        industry: "Boutiques",
        city: "Winter Garden",
        state: "FL",
        description: "Women's fashion boutique with seasonal collections.",
      },
      categoryScores: {
        contentOpportunity: 15,
        socialMarketingActivity: 13,
        purchasingPotential: 9,
        recurringContentPotential: 12,
        recentBusinessSignals: 7,
        creativeCinematicFit: 8,
        geographicServiceability: 5,
        stormiIntegrationPotential: 5,
        contactability: 4,
      },
      pipelineStage: "proposal",
      approvalStatus: "approved",
    }),
  ];
}
