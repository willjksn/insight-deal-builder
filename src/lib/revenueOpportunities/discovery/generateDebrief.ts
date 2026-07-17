import { callGeminiJsonText } from "@/lib/ai/geminiClient";
import { aiUsesMock } from "@/lib/ai/mockAi";
import type { DiscoveryDebrief, DiscoveryQuestionNote } from "@/lib/revenueOpportunities/types/discovery";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import { compileDiscoveryCallNotes } from "@/lib/revenueOpportunities/discovery/callNotes";
import { DISCOVERY_DEBRIEF_SYSTEM } from "@/lib/revenueOpportunities/discovery/prompts";
import { mockDiscoveryDebrief, parseDiscoveryDebrief } from "@/lib/revenueOpportunities/discovery/parseDiscovery";

export interface DiscoveryDebriefInput {
  questionNotes: DiscoveryQuestionNote[];
  additionalNotes?: string;
}

export async function generateDiscoveryDebrief(
  opportunity: RevenueOpportunity,
  input: DiscoveryDebriefInput
): Promise<{ debrief: DiscoveryDebrief; compiledNotes: string; usedLiveAi: boolean }> {
  const compiledNotes = compileDiscoveryCallNotes(input.questionNotes, input.additionalNotes);

  if (aiUsesMock()) {
    return {
      debrief: mockDiscoveryDebrief(opportunity, compiledNotes, input.questionNotes),
      compiledNotes,
      usedLiveAi: false,
    };
  }

  const qaBlock = input.questionNotes
    .filter((n) => n.answer?.trim())
    .map((n) => `Q: ${n.question}\nA: ${n.answer!.trim()}`)
    .join("\n\n");

  const userPrompt = [
    `Prospect: ${opportunity.subject.name}`,
    opportunity.campaignConcept?.coreConcept ? `Concept: ${opportunity.campaignConcept.coreConcept}` : "",
    qaBlock ? `Structured Q&A:\n${qaBlock}` : "",
    input.additionalNotes?.trim() ? `Additional notes:\n${input.additionalNotes.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const raw = await callGeminiJsonText(DISCOVERY_DEBRIEF_SYSTEM, userPrompt);
  const parsed = parseDiscoveryDebrief(raw);
  if (!parsed) {
    return {
      debrief: mockDiscoveryDebrief(opportunity, compiledNotes, input.questionNotes),
      compiledNotes,
      usedLiveAi: true,
    };
  }
  return { debrief: parsed, compiledNotes, usedLiveAi: true };
}
