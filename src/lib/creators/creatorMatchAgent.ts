import type { AgentDefinition, AgentRunResult } from "@/lib/revenueOpportunities/agents/instruction";
import { rankCreatorsForBrief, type MatchBrief } from "@/lib/creators/network";
import type { Creator } from "@/lib/creators/types";
import type { CreatorMatchResult } from "@/lib/creators/opsTypes";

export interface CreatorMatchInput {
  creators: Creator[];
  brief: MatchBrief;
  limit?: number;
}

export interface CreatorMatchOutput {
  matches: CreatorMatchResult[];
  brief: MatchBrief;
}

const AGENT_NAME = "creator_match";
const VERSION = "0.1.0";

/**
 * Creator Match Agent — explainable rule-based ranking over the roster.
 * Live AI enrichment can be layered later; this never invents fit claims.
 */
export const creatorMatchAgent: AgentDefinition<CreatorMatchInput, CreatorMatchOutput> = {
  name: AGENT_NAME,
  version: VERSION,
  instruction: {
    agentName: AGENT_NAME,
    version: VERSION,
    role: "Creator match agent",
    goal: "Rank IMG network creators against a campaign brief with explainable scores.",
    context: "Uses roster readiness, niche, platforms, location, and proof assets (rates/media kit).",
    tools: ["roster"],
    constraints: [
      "Never invent audience or performance claims",
      "Prefer campaign-ready / preferred creators",
      "Exclude applicants and unavailable by default",
    ],
    process: [
      "Filter active roster",
      "Score niche / platform / location / readiness",
      "Return ranked matches with reasons",
    ],
    outputSchema: "CreatorMatchOutput { matches, brief }",
    successCriteria: ["Scores 0-100", "Each match has reasons", "No invented metrics"],
    failureConditions: ["Empty roster"],
    fallback: ["Return empty matches"],
  },
  async execute(input): Promise<AgentRunResult<CreatorMatchOutput>> {
    const matches = rankCreatorsForBrief(input.creators, input.brief, input.limit ?? 10);
    return {
      agentName: AGENT_NAME,
      version: VERSION,
      output: { matches, brief: input.brief },
      confidence: {
        confidenceScore: matches.length ? 75 : 40,
        confidenceReasons: [
          matches.length
            ? `Ranked ${matches.length} creator(s) from roster`
            : "No matching creators on roster",
        ],
        assumptions: ["Rule-based scoring (no live AI)"],
        missingInformation: [
          ...(input.brief.requiredNiche ? [] : ["requiredNiche"]),
          ...(input.brief.requiredPlatforms?.length ? [] : ["requiredPlatforms"]),
        ],
      },
      evidence: matches.slice(0, 3).map((m) => ({
        claim: `${m.creatorName} scored ${m.score}`,
        sourceUrl: `creator://${m.creatorId}`,
        sourceTitle: m.creatorName,
        sourceType: "roster",
        retrievedAt: new Date().toISOString(),
        confidence: m.score,
      })),
      model: "rules",
      estimatedCostUsd: 0,
    };
  },
};
