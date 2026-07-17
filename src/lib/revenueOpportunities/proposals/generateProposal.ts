import { callGeminiJsonText } from "@/lib/ai/geminiClient";
import { aiUsesMock } from "@/lib/ai/mockAi";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { DiscoveryDebrief } from "@/lib/revenueOpportunities/types/discovery";
import type { ProposalDraftBundle } from "@/lib/revenueOpportunities/types/proposal";
import { PROPOSAL_DRAFT_SYSTEM } from "@/lib/revenueOpportunities/discovery/prompts";
import { mockProposalDraft, parseProposalDraft } from "@/lib/revenueOpportunities/proposals/parseProposal";

export async function generateProposalDraft(
  opportunity: RevenueOpportunity,
  debrief?: DiscoveryDebrief
): Promise<{ draft: ProposalDraftBundle; usedLiveAi: boolean }> {
  if (aiUsesMock()) {
    return { draft: mockProposalDraft(opportunity, debrief), usedLiveAi: false };
  }
  const userPrompt = [
    `Subject: ${opportunity.subject.name}`,
    opportunity.campaignConcept?.title ? `Concept: ${opportunity.campaignConcept.title}` : "",
    opportunity.campaignConcept?.coreConcept ? `Core: ${opportunity.campaignConcept.coreConcept}` : "",
    opportunity.recommendation?.estimatedMinimumValue
      ? `Budget hint min: ${opportunity.recommendation.estimatedMinimumValue}`
      : "",
    opportunity.recommendation?.estimatedMaximumValue
      ? `Budget hint max: ${opportunity.recommendation.estimatedMaximumValue}`
      : "",
    debrief?.summary ? `Discovery summary: ${debrief.summary}` : "",
    debrief?.budgetSignals ? `Budget signals: ${debrief.budgetSignals}` : "",
    debrief?.clientGoals?.length ? `Client goals: ${debrief.clientGoals.join("; ")}` : "",
    debrief?.shootGoals?.length ? `Shoot goals: ${debrief.shootGoals.join("; ")}` : "",
    debrief?.creativeMessage ? `Creative message: ${debrief.creativeMessage}` : "",
    debrief?.scriptSeedNotes ? `Script direction: ${debrief.scriptSeedNotes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await callGeminiJsonText(PROPOSAL_DRAFT_SYSTEM, userPrompt);
  const parsed = parseProposalDraft(raw);
  if (!parsed) {
    return { draft: mockProposalDraft(opportunity, debrief), usedLiveAi: true };
  }
  return { draft: parsed, usedLiveAi: true };
}
