import type { AgentDefinition, AgentRunResult } from "@/lib/revenueOpportunities/agents/instruction";
import type { OpportunityFollowUpPlan, RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import { generateFollowUp } from "@/lib/revenueOpportunities/followUp/generateFollowUp";

export interface FollowUpInput {
  opportunity: RevenueOpportunity;
}
export interface FollowUpOutput {
  followUp: OpportunityFollowUpPlan;
}

const AGENT_NAME = "follow_up";
const VERSION = "0.1.0";

export const followUpAgent: AgentDefinition<FollowUpInput, FollowUpOutput> = {
  name: AGENT_NAME,
  version: VERSION,
  instruction: {
    agentName: AGENT_NAME,
    version: VERSION,
    role: "Follow-up agent",
    goal: "Decide whether/when to follow up and draft a specific, well-timed message.",
    context: "Uses activity + dates on the opportunity; produces a draft for review, never sends.",
    tools: ["gemini"],
    constraints: ["Ground the angle in real context", "Never invent prices/dates/commitments"],
    process: ["Compute due/timing from dates", "Pick a channel", "Draft a concise, specific message"],
    outputSchema: "FollowUpOutput { followUp }",
    successCriteria: ["Correct due/timing", "Relevant angle", "Concise draft message"],
    failureConditions: ["No contactable channel"],
    fallback: ["Rule-based due date + next-action angle"],
  },
  async execute(input): Promise<AgentRunResult<FollowUpOutput>> {
    const { followUp, usedLiveAi, model } = await generateFollowUp(input.opportunity);
    return {
      agentName: AGENT_NAME,
      version: VERSION,
      output: { followUp },
      confidence: {
        confidenceScore: followUp.due ? 80 : 50,
        confidenceReasons: [
          followUp.due
            ? "Follow-up is due"
            : followUp.dueInDays != null
              ? `Due in ${followUp.dueInDays} day(s)`
              : "No follow-up date set",
        ],
        assumptions: usedLiveAi ? [] : ["Rule-based (no live AI)"],
        missingInformation: [],
      },
      evidence: [],
      model,
      estimatedCostUsd: usedLiveAi && model === "gemini" ? 0.006 : 0,
    };
  },
};
