import type { AgentDefinition, AgentRunResult } from "@/lib/revenueOpportunities/agents/instruction";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { OutreachDraftBundle } from "@/lib/revenueOpportunities/types/outreach";
import { generateOutreachDrafts } from "@/lib/revenueOpportunities/outreach/generateDrafts";

export interface OutreachDraftInput {
  opportunity: RevenueOpportunity;
}

const AGENT_NAME = "outreach_draft";
const VERSION = "0.1.0";

export const outreachDraftAgent: AgentDefinition<OutreachDraftInput, OutreachDraftBundle> = {
  name: AGENT_NAME,
  version: VERSION,
  instruction: {
    agentName: AGENT_NAME,
    version: VERSION,
    role: "Outreach draft agent",
    goal: "Generate email, LinkedIn DM, and Instagram DM drafts for human approval before sending.",
    context: "Phase 5 — drafts only; Gmail send arrives in Phase 6.",
    tools: ["gemini"],
    constraints: ["Never auto-send", "Personalize to opportunity subject", "Professional IMG tone"],
    process: ["Read opportunity context", "Draft three channel variants", "Return JSON for review"],
    outputSchema: "OutreachDraftBundle",
    successCriteria: ["All three channels populated", "Specific to business name"],
    failureConditions: ["Empty drafts"],
    fallback: ["Template drafts from mock generator"],
  },
  async execute(input: OutreachDraftInput): Promise<AgentRunResult<OutreachDraftBundle>> {
    const { drafts, usedLiveAi } = await generateOutreachDrafts(input.opportunity);
    return {
      agentName: AGENT_NAME,
      version: VERSION,
      output: { drafts },
      confidence: {
        confidenceScore: usedLiveAi ? 78 : 55,
        confidenceReasons: usedLiveAi ? ["Gemini outreach pass"] : ["Mock template drafts"],
        assumptions: usedLiveAi ? [] : ["SCOUT_USE_MOCK_AI enabled"],
        missingInformation: input.opportunity.contact?.email ? [] : ["Recipient email not verified"],
      },
      evidence: input.opportunity.evidence?.slice(0, 5) ?? [],
      model: usedLiveAi ? "gemini" : "mock",
      estimatedCostUsd: usedLiveAi ? 0.02 : 0,
    };
  },
};
