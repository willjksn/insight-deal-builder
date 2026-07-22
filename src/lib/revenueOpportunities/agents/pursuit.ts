import type { AgentDefinition, AgentRunResult } from "@/lib/revenueOpportunities/agents/instruction";
import type { OpportunityPursuit, RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import { generatePursuit } from "@/lib/revenueOpportunities/pursuit/generatePursuit";

export interface PursuitInput {
  opportunity: RevenueOpportunity;
}
export interface PursuitOutput {
  pursuit: OpportunityPursuit;
}

const AGENT_NAME = "pursuit";
const VERSION = "0.1.0";

const PRIORITY_SCORE: Record<OpportunityPursuit["priority"], number> = { high: 90, medium: 60, low: 30 };

export const pursuitAgent: AgentDefinition<PursuitInput, PursuitOutput> = {
  name: AGENT_NAME,
  version: VERSION,
  instruction: {
    agentName: AGENT_NAME,
    version: VERSION,
    role: "Pursuit strategist",
    goal: "Decide whether to pursue an opportunity now and lay out the next best actions.",
    context: "Reasons over the opportunity's own data; produces a plan for review, never auto-acts.",
    tools: ["gemini"],
    constraints: ["Base decision on fit/score/verification/timing/stage", "Never invent facts or contacts"],
    process: ["Weigh score + trust + timing + stage", "Choose pursue/hold/pass", "Sequence next actions"],
    outputSchema: "PursuitOutput { pursuit }",
    successCriteria: ["Clear decision + priority", "Grounded rationale", "Concrete sequenced steps"],
    failureConditions: ["Insufficient data to decide"],
    fallback: ["Rule-based decision from score + verification thresholds"],
  },
  async execute(input): Promise<AgentRunResult<PursuitOutput>> {
    const { pursuit, usedLiveAi, model } = await generatePursuit(input.opportunity);
    return {
      agentName: AGENT_NAME,
      version: VERSION,
      output: { pursuit },
      confidence: {
        confidenceScore: PRIORITY_SCORE[pursuit.priority],
        confidenceReasons: [`Decision: ${pursuit.decision} · priority ${pursuit.priority}`],
        assumptions: usedLiveAi ? [] : ["Rule-based (no live AI)"],
        missingInformation: [],
      },
      evidence: [],
      model,
      estimatedCostUsd: usedLiveAi && model === "gemini" ? 0.008 : 0,
    };
  },
};
