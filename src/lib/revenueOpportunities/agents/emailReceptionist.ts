import type { AgentDefinition, AgentRunResult } from "@/lib/revenueOpportunities/agents/instruction";
import type { RevenueEmailThread } from "@/lib/revenueOpportunities/types/emailThread";
import type { EmailClassificationResult } from "@/lib/revenueOpportunities/types/emailThread";
import { classifyEmailThread } from "@/lib/revenueOpportunities/inbox/classifyReply";

export interface EmailReceptionistInput {
  thread: RevenueEmailThread;
}

const AGENT_NAME = "email_receptionist";
const VERSION = "0.1.0";

export const emailReceptionistAgent: AgentDefinition<EmailReceptionistInput, EmailClassificationResult> = {
  name: AGENT_NAME,
  version: VERSION,
  instruction: {
    agentName: AGENT_NAME,
    version: VERSION,
    role: "Email receptionist",
    goal: "Classify inbound replies and suggest draft responses — never auto-send.",
    context: "Phase 6 — draft-only autopilot tied to Gmail inbox sync.",
    tools: ["gemini"],
    constraints: ["Never send email automatically", "Flag spam and OOO clearly"],
    process: ["Read latest inbound message", "Classify intent", "Suggest reply draft when appropriate"],
    outputSchema: "EmailClassificationResult",
    successCriteria: ["Classification matches message intent"],
    failureConditions: ["Empty thread"],
    fallback: ["Rule-based mock classifier"],
  },
  async execute(input: EmailReceptionistInput): Promise<AgentRunResult<EmailClassificationResult>> {
    const { result, usedLiveAi } = await classifyEmailThread(input.thread);
    return {
      agentName: AGENT_NAME,
      version: VERSION,
      output: result,
      confidence: {
        confidenceScore: result.confidenceScore,
        confidenceReasons: usedLiveAi ? ["Gemini classification"] : ["Mock classifier"],
        assumptions: [],
        missingInformation: [],
      },
      evidence: [],
      model: usedLiveAi ? "gemini" : "mock",
      estimatedCostUsd: usedLiveAi ? 0.01 : 0,
    };
  },
};
