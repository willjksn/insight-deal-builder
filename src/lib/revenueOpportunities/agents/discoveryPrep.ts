import type { AgentDefinition, AgentRunResult } from "@/lib/revenueOpportunities/agents/instruction";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { DiscoveryPrepBundle } from "@/lib/revenueOpportunities/types/discovery";
import { generateDiscoveryPrep } from "@/lib/revenueOpportunities/discovery/generatePrep";

export interface DiscoveryPrepInput {
  opportunity: RevenueOpportunity;
}

const AGENT_NAME = "discovery_prep";
const VERSION = "0.1.0";

export const discoveryPrepAgent: AgentDefinition<DiscoveryPrepInput, DiscoveryPrepBundle> = {
  name: AGENT_NAME,
  version: VERSION,
  instruction: {
    agentName: AGENT_NAME,
    version: VERSION,
    role: "Discovery call prep",
    goal: "Generate a structured pre-call brief for qualifying IMG opportunities.",
    context: "Phase 7 — discovery sessions before proposals.",
    tools: ["gemini"],
    constraints: ["No shot lists", "Qualify budget and timeline"],
    process: ["Review opportunity", "Draft prep brief JSON"],
    outputSchema: "DiscoveryPrepBundle",
    successCriteria: ["Actionable questions and talking points"],
    failureConditions: ["Empty brief"],
    fallback: ["Template prep from opportunity data"],
  },
  async execute(input: DiscoveryPrepInput): Promise<AgentRunResult<DiscoveryPrepBundle>> {
    const { prepBrief, usedLiveAi } = await generateDiscoveryPrep(input.opportunity);
    return {
      agentName: AGENT_NAME,
      version: VERSION,
      output: { prepBrief },
      confidence: {
        confidenceScore: usedLiveAi ? 76 : 58,
        confidenceReasons: usedLiveAi ? ["Gemini discovery prep"] : ["Mock prep template"],
        assumptions: [],
        missingInformation: input.opportunity.contact?.name ? [] : ["Primary contact not verified"],
      },
      evidence: input.opportunity.evidence?.slice(0, 5) ?? [],
      model: usedLiveAi ? "gemini" : "mock",
      estimatedCostUsd: usedLiveAi ? 0.02 : 0,
    };
  },
};
