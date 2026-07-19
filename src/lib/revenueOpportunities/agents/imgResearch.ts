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
  discoverCount?: number;
  enrichedCount?: number;
}

const AGENT_NAME = "img_research";
const VERSION = "0.2.0";

export const imgResearchAgent: AgentDefinition<ImgResearchInput, ResearchAgentOutput> = {
  name: AGENT_NAME,
  version: VERSION,
  instruction: {
    agentName: AGENT_NAME,
    version: VERSION,
    role: "IMG client research agent",
    goal: "Find and deeply qualify local businesses that may buy cinematic IMG production.",
    context: "Live-only: multi-query Tavily discovery + per-prospect Gemini deep research. No dummy prospects.",
    tools: ["tavily", "gemini"],
    constraints: ["Evidence required for factual claims", "Respect campaign geography and industry"],
    process: [
      "Build multi-query plan",
      "Tavily advanced searches",
      "Gemini discover shortlist",
      "Per-candidate enrich + qualify",
      "Score with IMG model",
    ],
    outputSchema: "ResearchAgentOutput",
    successCriteria: ["Evidence-backed prospects", "Live search + AI"],
    failureConditions: ["Mock AI enabled", "Missing Tavily", "Empty discover/enrich"],
    fallback: ["Fail loudly — never invent dummy businesses"],
  },
  async execute(input: ImgResearchInput): Promise<AgentRunResult<ResearchAgentOutput>> {
    const pass = await runImgResearchPass(input.campaign);
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
        missingInformation: pass.prospects.length ? [] : ["No candidates survived discover/enrich"],
      },
      evidence: pass.prospects.flatMap((p) => p.evidence).slice(0, 12),
      model: "gemini+tavily-deep",
      estimatedCostUsd: 0.15 + (pass.enrichedCount ?? 0) * 0.04,
    };
  },
};
