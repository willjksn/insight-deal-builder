import type { AgentDefinition, AgentRunResult } from "@/lib/revenueOpportunities/agents/instruction";
import type { OpportunityBrandMatches, RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import { generateBrandOpportunities } from "@/lib/revenueOpportunities/brand/generateBrandOpportunities";

export interface BrandInput {
  opportunity: RevenueOpportunity;
}
export interface BrandOutput {
  brand: OpportunityBrandMatches;
}

const AGENT_NAME = "brand_opportunity";
const VERSION = "0.1.0";

export const brandOpportunityAgent: AgentDefinition<BrandInput, BrandOutput> = {
  name: AGENT_NAME,
  version: VERSION,
  instruction: {
    agentName: AGENT_NAME,
    version: VERSION,
    role: "Brand-opportunity agent",
    goal: "Find brand-partnership openings (ambassador/creator programs, sponsored campaigns) that fit the creator.",
    context: "Read-only intel for Stormi-style brand partnerships; never changes records.",
    tools: ["tavily", "gemini"],
    constraints: ["Only include brands/programs present in sources with a URL", "Never invent programs or contacts"],
    process: ["Search niche for creator/ambassador programs", "Filter to active + relevant", "Summarize fit"],
    outputSchema: "BrandOutput { brand }",
    successCriteria: ["Real brands/programs with URLs", "Fit rationale", "Contact route when stated"],
    failureConditions: ["No brand programs found"],
    fallback: ["Return empty match set"],
  },
  async execute(input): Promise<AgentRunResult<BrandOutput>> {
    const { brand, usedLiveAi, model } = await generateBrandOpportunities(input.opportunity);
    return {
      agentName: AGENT_NAME,
      version: VERSION,
      output: { brand },
      confidence: {
        confidenceScore: brand.matches.length ? 60 : 0,
        confidenceReasons: [`${brand.matches.length} brand opening(s) found`],
        assumptions: usedLiveAi ? [] : ["Rule-based (no live AI)"],
        missingInformation: brand.matches.length ? [] : ["No brand programs found"],
      },
      evidence: [],
      model,
      estimatedCostUsd: usedLiveAi && model === "gemini" ? 0.012 : 0,
    };
  },
};
