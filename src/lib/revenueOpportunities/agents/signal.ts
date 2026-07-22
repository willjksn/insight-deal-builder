import type { AgentDefinition, AgentRunResult } from "@/lib/revenueOpportunities/agents/instruction";
import type { OpportunitySignals, RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import { generateSignals } from "@/lib/revenueOpportunities/signals/generateSignals";

export interface SignalInput {
  opportunity: RevenueOpportunity;
}
export interface SignalOutput {
  signals: OpportunitySignals;
}

const AGENT_NAME = "signal";
const VERSION = "0.1.0";

export const signalAgent: AgentDefinition<SignalInput, SignalOutput> = {
  name: AGENT_NAME,
  version: VERSION,
  instruction: {
    agentName: AGENT_NAME,
    version: VERSION,
    role: "Signal agent",
    goal: "Detect timing/buying signals from live research to judge whether now is a good moment to engage.",
    context: "Read-only intel; annotates the opportunity, never changes scores or stage.",
    tools: ["tavily", "gemini"],
    constraints: ["Only report signals present in sources with a URL", "Never invent events or dates"],
    process: ["Search recent news/triggers", "Extract dated signals", "Score timing 0-100"],
    outputSchema: "SignalOutput { signals }",
    successCriteria: ["Concrete, dated signals", "Timing score", "Engage-now recommendation"],
    failureConditions: ["No material signals found"],
    fallback: ["Surface previously researched why-now/growth signals"],
  },
  async execute(input): Promise<AgentRunResult<SignalOutput>> {
    const { signals, usedLiveAi, model } = await generateSignals(input.opportunity);
    return {
      agentName: AGENT_NAME,
      version: VERSION,
      output: { signals },
      confidence: {
        confidenceScore: signals.timingScore,
        confidenceReasons: [`${signals.signals.length} signal(s) · timing ${signals.timingScore}/100`],
        assumptions: usedLiveAi ? [] : ["Rule-based (no live AI)"],
        missingInformation: signals.signals.length ? [] : ["No recent signals found"],
      },
      evidence: [],
      model,
      estimatedCostUsd: usedLiveAi && model === "gemini" ? 0.012 : 0,
    };
  },
};
