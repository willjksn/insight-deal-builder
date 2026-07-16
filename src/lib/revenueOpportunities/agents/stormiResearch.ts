import type { AgentDefinition, AgentRunResult } from "@/lib/revenueOpportunities/agents/instruction";
import type { RevenueCampaign } from "@/lib/revenueOpportunities/types/campaign";
import type { ResearchAgentOutput } from "@/lib/revenueOpportunities/agents/imgResearch";
import { runStormiResearchPass } from "@/lib/revenueOpportunities/research/runResearchPass";

export interface StormiResearchInput {
  campaign: RevenueCampaign;
}

const AGENT_NAME = "stormi_research";
const VERSION = "0.1.0";

export const stormiResearchAgent: AgentDefinition<StormiResearchInput, ResearchAgentOutput> = {
  name: AGENT_NAME,
  version: VERSION,
  instruction: {
    agentName: AGENT_NAME,
    version: VERSION,
    role: "Stormi brand research agent",
    goal: "Find brands suitable for Stormi creator partnerships with IMG production.",
    context: "Uses Tavily + Gemini in live mode.",
    tools: ["tavily", "gemini"],
    constraints: ["Brand safety and niche fit", "Evidence-backed claims only"],
    process: ["Build brand search query", "Tavily", "Gemini extraction", "Score prospects"],
    outputSchema: "ResearchAgentOutput",
    successCriteria: ["Brand fit signals", "Creator partnership potential"],
    failureConditions: ["Empty research with no fallback"],
    fallback: ["Mock brand prospects"],
  },
  async execute(input: StormiResearchInput): Promise<AgentRunResult<ResearchAgentOutput>> {
    const pass = await runStormiResearchPass(input.campaign);
    const topScore = pass.prospects[0]?.scoring.totalScore ?? 0;
    return {
      agentName: AGENT_NAME,
      version: VERSION,
      output: pass,
      confidence: {
        confidenceScore: Math.min(92, topScore),
        confidenceReasons: pass.usedLiveSearch ? ["Live Tavily + Gemini pass"] : ["Mock research mode"],
        assumptions: pass.usedLiveSearch ? [] : ["Development mock mode"],
        missingInformation: [],
      },
      evidence: pass.prospects.flatMap((p) => p.evidence).slice(0, 12),
      model: pass.usedLiveAi ? "gemini+tavily" : "mock",
      estimatedCostUsd: pass.usedLiveAi ? 0.05 : 0,
    };
  },
};
