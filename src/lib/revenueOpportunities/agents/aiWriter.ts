import type { AgentDefinition, AgentRunResult } from "@/lib/revenueOpportunities/agents/instruction";
import { generateAiWriterEmail } from "@/lib/revenueOpportunities/outreach/generateAiWriter";
import type { AiWriterRequest, OutreachDraftBundle } from "@/lib/revenueOpportunities/types/outreach";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";

export interface AiWriterAgentInput {
  request: AiWriterRequest;
  opportunity?: RevenueOpportunity | null;
}

const AGENT_NAME = "ai_writer";
const VERSION = "0.1.0";

export const aiWriterAgent: AgentDefinition<AiWriterAgentInput, OutreachDraftBundle> = {
  name: AGENT_NAME,
  version: VERSION,
  instruction: {
    agentName: AGENT_NAME,
    version: VERSION,
    role: "AI email writer",
    goal: "Turn a user brief into one email draft for human approval before Gmail.",
    context: "Ad-hoc compose on Outreach; optional opportunity context.",
    tools: ["gemini"],
    constraints: ["Never auto-send", "Honor the user brief", "Professional IMG tone"],
    process: ["Read brief and optional context", "Draft one email", "Return JSON for review"],
    outputSchema: "OutreachDraftBundle",
    successCriteria: ["Email draft with subject and body"],
    failureConditions: ["Empty brief", "Empty draft body"],
    fallback: ["Template draft from mock generator"],
  },
  async execute(input: AiWriterAgentInput): Promise<AgentRunResult<OutreachDraftBundle>> {
    const { drafts, usedLiveAi } = await generateAiWriterEmail(input.request, input.opportunity);
    return {
      agentName: AGENT_NAME,
      version: VERSION,
      output: { drafts },
      confidence: {
        confidenceScore: usedLiveAi ? 80 : 55,
        confidenceReasons: usedLiveAi ? ["Gemini AI Writer pass"] : ["Mock template draft"],
        assumptions: usedLiveAi ? [] : ["SCOUT_USE_MOCK_AI enabled"],
        missingInformation: input.request.toEmail?.trim() ? [] : ["Recipient email not provided"],
      },
      evidence: input.opportunity?.evidence?.slice(0, 3) ?? [],
      model: usedLiveAi ? "gemini" : "mock",
      estimatedCostUsd: usedLiveAi ? 0.015 : 0,
    };
  },
};
