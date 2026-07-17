import type { AgentDefinition, AgentRunResult } from "@/lib/revenueOpportunities/agents/instruction";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { DiscoveryDebriefBundle, DiscoveryQuestionNote } from "@/lib/revenueOpportunities/types/discovery";
import { generateDiscoveryDebrief } from "@/lib/revenueOpportunities/discovery/generateDebrief";

export interface DiscoveryDebriefInput {
  opportunity: RevenueOpportunity;
  questionNotes: DiscoveryQuestionNote[];
  additionalNotes?: string;
}

const AGENT_NAME = "discovery_debrief";
const VERSION = "0.1.0";

export const discoveryDebriefAgent: AgentDefinition<DiscoveryDebriefInput, DiscoveryDebriefBundle> = {
  name: AGENT_NAME,
  version: VERSION,
  instruction: {
    agentName: AGENT_NAME,
    version: VERSION,
    role: "Discovery debrief",
    goal: "Structure post-call notes into qualification summary and next steps.",
    context: "Phase 7 — after discovery call notes are captured.",
    tools: ["gemini"],
    constraints: ["Ground analysis in structured Q&A and notes"],
    process: ["Read Q&A answers", "Output debrief JSON with creative direction"],
    outputSchema: "DiscoveryDebriefBundle",
    successCriteria: ["Clear fit assessment and follow-ups"],
    failureConditions: ["No answers captured"],
    fallback: ["Rule-based debrief from Q&A keywords"],
  },
  async execute(input: DiscoveryDebriefInput): Promise<AgentRunResult<DiscoveryDebriefBundle>> {
    const { debrief, compiledNotes, usedLiveAi } = await generateDiscoveryDebrief(input.opportunity, {
      questionNotes: input.questionNotes,
      additionalNotes: input.additionalNotes,
    });
    const hasAnswers = input.questionNotes.some((n) => n.answer?.trim()) || Boolean(input.additionalNotes?.trim());
    return {
      agentName: AGENT_NAME,
      version: VERSION,
      output: { debrief },
      confidence: {
        confidenceScore: usedLiveAi ? 74 : 55,
        confidenceReasons: usedLiveAi ? ["Gemini debrief pass"] : ["Mock debrief"],
        assumptions: [],
        missingInformation: hasAnswers ? [] : ["No discovery answers captured"],
      },
      evidence: [],
      model: usedLiveAi ? "gemini" : "mock",
      estimatedCostUsd: usedLiveAi ? 0.02 : 0,
    };
  },
};
