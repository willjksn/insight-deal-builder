import type { AgentDefinition, AgentRunResult } from "@/lib/revenueOpportunities/agents/instruction";
import type { RevenueCampaign } from "@/lib/revenueOpportunities/types/campaign";
import type { ResearchAgentOutput } from "@/lib/revenueOpportunities/agents/imgResearch";
import { runStormiResearchPass } from "@/lib/revenueOpportunities/research/runResearchPass";

export interface StormiResearchInput {
  campaign: RevenueCampaign;
}

const AGENT_NAME = "stormi_research";
const VERSION = "0.2.0";

export const stormiResearchAgent: AgentDefinition<StormiResearchInput, ResearchAgentOutput> = {
  name: AGENT_NAME,
  version: VERSION,
  instruction: {
    agentName: AGENT_NAME,
    version: VERSION,
    role: "Stormi brand research agent",
    goal: "Find and deeply qualify brands for Stormi creator partnerships with IMG production.",
    context: "Live-only: multi-query Tavily discovery + per-brand Gemini deep research. No dummy brands.",
    tools: ["tavily", "gemini"],
    constraints: ["Brand safety and niche fit", "Evidence-backed claims only"],
    process: [
      "Build multi-query plan",
      "Tavily advanced searches",
      "Gemini discover shortlist",
      "Per-brand enrich + qualify",
      "Score prospects",
    ],
    outputSchema: "ResearchAgentOutput",
    successCriteria: ["Evidence-backed brand fit", "Live search + AI"],
    failureConditions: ["Mock AI enabled", "Missing Tavily", "Empty discover/enrich"],
    fallback: ["Fail loudly — never invent dummy brands"],
  },
  async execute(input: StormiResearchInput): Promise<AgentRunResult<ResearchAgentOutput>> {
    const pass = await runStormiResearchPass(input.campaign);
    const topScore = pass.prospects[0]?.scoring.totalScore ?? 0;
    return {
      agentName: AGENT_NAME,
      version: VERSION,
      output: pass,
      confidence: {
        confidenceScore: Math.min(92, Math.max(topScore, pass.enrichedCount ? 55 : 0)),
        confidenceReasons: [
          `Live deep research: ${pass.discoverCount ?? 0} shortlisted, ${pass.enrichedCount ?? 0} qualified`,
        ],
        assumptions: [],
        missingInformation: pass.prospects.length ? [] : ["No brands survived discover/enrich"],
      },
      evidence: pass.prospects.flatMap((p) => p.evidence).slice(0, 12),
      model: "gemini+tavily-deep",
      estimatedCostUsd: 0.15 + (pass.enrichedCount ?? 0) * 0.04,
    };
  },
};
