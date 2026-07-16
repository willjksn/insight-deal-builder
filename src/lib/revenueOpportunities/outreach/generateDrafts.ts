import { callGeminiJsonText } from "@/lib/ai/geminiClient";
import { aiUsesMock } from "@/lib/ai/mockAi";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { OutreachDraftItem } from "@/lib/revenueOpportunities/types/outreach";
import { OUTREACH_DRAFT_SYSTEM } from "@/lib/revenueOpportunities/outreach/prompts";
import { mockOutreachDrafts, parseOutreachDrafts } from "@/lib/revenueOpportunities/outreach/parseOutreach";

export async function generateOutreachDrafts(opportunity: RevenueOpportunity): Promise<{
  drafts: OutreachDraftItem[];
  usedLiveAi: boolean;
}> {
  if (aiUsesMock()) {
    return { drafts: mockOutreachDrafts(opportunity), usedLiveAi: false };
  }

  const userPrompt = [
    `Subject: ${opportunity.subject.name}`,
    opportunity.subject.industry ? `Industry: ${opportunity.subject.industry}` : "",
    opportunity.subject.city ? `City: ${opportunity.subject.city}, ${opportunity.subject.state ?? ""}` : "",
    opportunity.subject.description ? `Description: ${opportunity.subject.description}` : "",
    opportunity.campaignConcept?.title ? `Campaign concept: ${opportunity.campaignConcept.title}` : "",
    opportunity.campaignConcept?.coreConcept ? `Core concept: ${opportunity.campaignConcept.coreConcept}` : "",
    opportunity.campaignConcept?.hook ? `Hook: ${opportunity.campaignConcept.hook}` : "",
    opportunity.recommendation?.serviceName ? `Recommended service: ${opportunity.recommendation.serviceName}` : "",
    opportunity.research?.marketingGaps?.length
      ? `Marketing gaps: ${opportunity.research.marketingGaps.join("; ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await callGeminiJsonText(OUTREACH_DRAFT_SYSTEM, userPrompt);
  let drafts = parseOutreachDrafts(raw);
  if (drafts.length === 0) {
    drafts = mockOutreachDrafts(opportunity);
    return { drafts, usedLiveAi: true };
  }
  return { drafts, usedLiveAi: true };
}
