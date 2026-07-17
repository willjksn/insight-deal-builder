import { callGeminiJsonText } from "@/lib/ai/geminiClient";
import { aiUsesMock } from "@/lib/ai/mockAi";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { DiscoveryPrepBrief } from "@/lib/revenueOpportunities/types/discovery";
import { DISCOVERY_PREP_SYSTEM } from "@/lib/revenueOpportunities/discovery/prompts";
import { mockDiscoveryPrep, parseDiscoveryPrep } from "@/lib/revenueOpportunities/discovery/parseDiscovery";

function opportunityContext(opportunity: RevenueOpportunity): string {
  return [
    `Subject: ${opportunity.subject.name}`,
    opportunity.subject.industry ? `Industry: ${opportunity.subject.industry}` : "",
    opportunity.campaignConcept?.title ? `Concept: ${opportunity.campaignConcept.title}` : "",
    opportunity.campaignConcept?.coreConcept ? `Core: ${opportunity.campaignConcept.coreConcept}` : "",
    opportunity.recommendation?.serviceName ? `Service: ${opportunity.recommendation.serviceName}` : "",
    opportunity.recommendation?.estimatedMinimumValue
      ? `Est. value min: ${opportunity.recommendation.estimatedMinimumValue}`
      : "",
    opportunity.research?.marketingGaps?.length
      ? `Gaps: ${opportunity.research.marketingGaps.join("; ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function generateDiscoveryPrep(opportunity: RevenueOpportunity): Promise<{
  prepBrief: DiscoveryPrepBrief;
  usedLiveAi: boolean;
}> {
  if (aiUsesMock()) {
    return { prepBrief: mockDiscoveryPrep(opportunity), usedLiveAi: false };
  }
  const raw = await callGeminiJsonText(DISCOVERY_PREP_SYSTEM, opportunityContext(opportunity));
  const parsed = parseDiscoveryPrep(raw);
  if (!parsed) {
    return { prepBrief: mockDiscoveryPrep(opportunity), usedLiveAi: true };
  }
  return { prepBrief: parsed, usedLiveAi: true };
}
