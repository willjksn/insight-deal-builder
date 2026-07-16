import { summarizeWebResearch } from "@/lib/search/researchSummarize";
import { tavilySearch } from "@/lib/search/tavilyClient";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import { buildConceptContextLines } from "@/lib/revenueOpportunities/research/buildQuery";
import { revenueResearchLive } from "@/lib/revenueOpportunities/research/mode";
import { parseCampaignConceptResponse } from "@/lib/revenueOpportunities/research/parseResearch";
import { CAMPAIGN_CONCEPT_SYSTEM } from "@/lib/revenueOpportunities/research/prompts";
import type { CampaignConceptSummary } from "@/lib/revenueOpportunities/types/opportunity";
import type { AgentEvidence } from "@/lib/revenueOpportunities/types";

export interface CampaignConceptPassResult {
  campaignConcept: CampaignConceptSummary;
  evidence: AgentEvidence[];
  usedLiveSearch: boolean;
}

export async function runCampaignConceptPass(opportunity: RevenueOpportunity): Promise<CampaignConceptPassResult> {
  const subject = opportunity.subject;
  const contextLines = buildConceptContextLines(subject.name, subject.industry, opportunity.campaignName);

  if (!revenueResearchLive()) {
    const existing = opportunity.campaignConcept;
    return {
      campaignConcept: {
        title: existing?.title ?? `${subject.name} — cinematic brand story`,
        campaignObjective: existing?.campaignObjective ?? "Elevate brand perception with premium short-form video",
        targetAudience: existing?.targetAudience ?? "Local customers and social followers",
        coreConcept: existing?.coreConcept ?? "Cinematic day-in-the-life showcasing signature experience",
        hook: existing?.hook ?? "Open on a premium detail shot, reveal the full experience",
        recommendedDeliverables: existing?.recommendedDeliverables ?? ["3 reels", "15 photos", "1 brand film"],
        recommendedPlatforms: existing?.recommendedPlatforms ?? ["Instagram", "TikTok"],
        stormiRole: opportunity.opportunityType === "stormi_brand" ? "Creator-led lifestyle integration" : existing?.stormiRole,
        imgRole: existing?.imgRole ?? "Full cinematic production and edit",
        businessValue: existing?.businessValue ?? "Higher-quality content increases trust and bookings",
        estimatedComplexity: existing?.estimatedComplexity ?? "medium",
        estimatedProductionDays: existing?.estimatedProductionDays ?? 1,
      },
      evidence: opportunity.evidence ?? [],
      usedLiveSearch: false,
    };
  }

  const query = [subject.name, subject.industry, subject.city, subject.state, "brand marketing social media"]
    .filter(Boolean)
    .join(" ");
  const search = await tavilySearch(query, { maxResults: 5, searchDepth: "basic", includeAnswer: true });
  const raw = await summarizeWebResearch<unknown>(CAMPAIGN_CONCEPT_SYSTEM, search, contextLines);
  const parsed = parseCampaignConceptResponse(raw);

  if (!parsed.campaignConcept?.title && !parsed.campaignConcept?.coreConcept) {
    throw new Error("Campaign concept agent returned empty concept");
  }

  return {
    campaignConcept: parsed.campaignConcept!,
    evidence: parsed.evidence.length ? parsed.evidence : opportunity.evidence ?? [],
    usedLiveSearch: true,
  };
}
