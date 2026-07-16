import type { AgentDefinition, AgentRunResult } from "@/lib/revenueOpportunities/agents/instruction";
import type { RevenueCampaign } from "@/lib/revenueOpportunities/types/campaign";
import type { ParsedResearchProspect } from "@/lib/revenueOpportunities/research/parseResearch";
import { runImgResearchPass } from "@/lib/revenueOpportunities/research/runResearchPass";

export interface ImgResearchInput {
  campaign: RevenueCampaign;
}

export interface ResearchAgentOutput {
  prospects: ParsedResearchProspect[];
  searchQuery: string;
  usedLiveSearch: boolean;
  usedLiveAi: boolean;
}

const AGENT_NAME = "img_research";
const VERSION = "0.1.0";

export const imgResearchAgent: AgentDefinition<ImgResearchInput, ResearchAgentOutput> = {
  name: AGENT_NAME,
  version: VERSION,
  instruction: {
    agentName: AGENT_NAME,
    version: VERSION,
    role: "IMG client research agent",
    goal: "Find and qualify local businesses that may buy cinematic IMG production.",
    context: "Uses Tavily search + Gemini structured extraction in live mode; mock prospects in dev.",
    tools: ["tavily", "gemini"],
    constraints: ["Evidence required for factual claims", "Respect campaign geography and industry"],
    process: ["Build search query", "Tavily search", "Gemini JSON extraction", "Score with IMG model"],
    outputSchema: "ResearchAgentOutput",
    successCriteria: ["1+ qualified prospects", "Evidence URLs from search"],
    failureConditions: ["No Tavily key in live mode", "Empty parse with no fallback"],
    fallback: ["Return mock prospects in dev/mock mode"],
  },
  async execute(input: ImgResearchInput): Promise<AgentRunResult<ResearchAgentOutput>> {
    const pass = await runImgResearchPass(input.campaign);
    const topScore = pass.prospects[0]?.scoring.totalScore ?? 0;
    return {
      agentName: AGENT_NAME,
      version: VERSION,
      output: pass,
      confidence: {
        confidenceScore: Math.min(92, topScore),
        confidenceReasons: pass.usedLiveSearch ? ["Live Tavily + Gemini pass"] : ["Mock research mode"],
        assumptions: pass.usedLiveSearch ? [] : ["SCOUT_USE_MOCK_AI or missing TAVILY_API_KEY"],
        missingInformation: [],
      },
      evidence: pass.prospects.flatMap((p) => p.evidence).slice(0, 12),
      model: pass.usedLiveAi ? "gemini+tavily" : "mock",
      estimatedCostUsd: pass.usedLiveAi ? 0.05 : 0,
    };
  },
};
