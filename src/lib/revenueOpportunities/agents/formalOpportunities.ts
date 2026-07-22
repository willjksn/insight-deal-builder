import type { AgentDefinition, AgentRunResult } from "@/lib/revenueOpportunities/agents/instruction";
import type { OpportunityFormalMatches, RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import { generateFormalOpportunities } from "@/lib/revenueOpportunities/formal/generateFormalOpportunities";

export interface FormalInput {
  opportunity: RevenueOpportunity;
}
export interface FormalOutput {
  formal: OpportunityFormalMatches;
}

const AGENT_NAME = "formal_opportunities";
const VERSION = "0.1.0";

export const formalOpportunitiesAgent: AgentDefinition<FormalInput, FormalOutput> = {
  name: AGENT_NAME,
  version: VERSION,
  instruction: {
    agentName: AGENT_NAME,
    version: VERSION,
    role: "Formal-opportunities agent",
    goal: "Find structured openings (RFPs, grants, open calls, sponsorships) the studio could bid on.",
    context: "Read-only intel; annotates the opportunity, never changes records.",
    tools: ["tavily", "gemini"],
    constraints: ["Only include openings present in sources with a URL", "Never invent RFPs or deadlines"],
    process: ["Search industry/region for formal openings", "Filter to active + relevant", "Summarize fit"],
    outputSchema: "FormalOutput { formal }",
    successCriteria: ["Active openings with URLs", "Deadlines when stated", "Fit rationale"],
    failureConditions: ["No formal openings found"],
    fallback: ["Return empty match set"],
  },
  async execute(input): Promise<AgentRunResult<FormalOutput>> {
    const { formal, usedLiveAi, model } = await generateFormalOpportunities(input.opportunity);
    return {
      agentName: AGENT_NAME,
      version: VERSION,
      output: { formal },
      confidence: {
        confidenceScore: formal.matches.length ? 60 : 0,
        confidenceReasons: [`${formal.matches.length} formal opening(s) found`],
        assumptions: usedLiveAi ? [] : ["Rule-based (no live AI)"],
        missingInformation: formal.matches.length ? [] : ["No formal openings found"],
      },
      evidence: [],
      model,
      estimatedCostUsd: usedLiveAi && model === "gemini" ? 0.012 : 0,
    };
  },
};
