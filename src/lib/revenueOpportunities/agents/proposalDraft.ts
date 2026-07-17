import type { AgentDefinition, AgentRunResult } from "@/lib/revenueOpportunities/agents/instruction";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { DiscoveryDebrief } from "@/lib/revenueOpportunities/types/discovery";
import type { ProposalDraftBundle } from "@/lib/revenueOpportunities/types/proposal";
import { generateProposalDraft } from "@/lib/revenueOpportunities/proposals/generateProposal";

export interface ProposalDraftInput {
  opportunity: RevenueOpportunity;
  debrief?: DiscoveryDebrief;
}

const AGENT_NAME = "proposal_draft";
const VERSION = "0.1.0";

export const proposalDraftAgent: AgentDefinition<ProposalDraftInput, ProposalDraftBundle> = {
  name: AGENT_NAME,
  version: VERSION,
  instruction: {
    agentName: AGENT_NAME,
    version: VERSION,
    role: "Proposal draft agent",
    goal: "Draft proposal outline and agreement prefill for human review.",
    context: "Phase 7 — extends ShootSpine agreements, not duplicate CRM.",
    tools: ["gemini"],
    constraints: ["No shot lists", "Human approval before sending"],
    process: ["Synthesize opportunity + discovery", "Draft proposal JSON"],
    outputSchema: "ProposalDraftBundle",
    successCriteria: ["Clear scope and investment range"],
    failureConditions: ["Empty proposal"],
    fallback: ["Template proposal from opportunity"],
  },
  async execute(input: ProposalDraftInput): Promise<AgentRunResult<ProposalDraftBundle>> {
    const { draft, usedLiveAi } = await generateProposalDraft(input.opportunity, input.debrief);
    return {
      agentName: AGENT_NAME,
      version: VERSION,
      output: draft,
      confidence: {
        confidenceScore: usedLiveAi ? 77 : 56,
        confidenceReasons: usedLiveAi ? ["Gemini proposal draft"] : ["Mock proposal template"],
        assumptions: [],
        missingInformation: input.debrief ? [] : ["No discovery debrief — used opportunity data only"],
      },
      evidence: input.opportunity.evidence?.slice(0, 5) ?? [],
      model: usedLiveAi ? "gemini" : "mock",
      estimatedCostUsd: usedLiveAi ? 0.03 : 0,
    };
  },
};
