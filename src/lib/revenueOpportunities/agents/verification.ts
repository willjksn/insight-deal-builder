import type { AgentDefinition, AgentRunResult } from "@/lib/revenueOpportunities/agents/instruction";
import type {
  OpportunityVerification,
  RevenueOpportunity,
} from "@/lib/revenueOpportunities/types/opportunity";
import { generateVerification } from "@/lib/revenueOpportunities/verification/generateVerification";

export interface VerificationInput {
  opportunity: RevenueOpportunity;
}

export interface VerificationOutput {
  verification: OpportunityVerification;
}

const AGENT_NAME = "verification";
const VERSION = "0.1.0";

export const verificationAgent: AgentDefinition<VerificationInput, VerificationOutput> = {
  name: AGENT_NAME,
  version: VERSION,
  instruction: {
    agentName: AGENT_NAME,
    version: VERSION,
    role: "Verification agent",
    goal: "Assess how trustworthy an opportunity's evidence and claims are before it advances.",
    context: "Read-only assessment; annotates the opportunity, never changes scores or approval.",
    tools: ["gemini"],
    constraints: [
      "Never invent sources",
      "Only treat a claim as verified when a real source URL supports it",
      "Never modify records — produce a report for review",
    ],
    process: [
      "Collect evidence and observed facts",
      "Separate verified from unverified claims",
      "Score trust from evidence coverage + source diversity",
    ],
    outputSchema: "VerificationOutput { verification }",
    successCriteria: ["Verified/unverified split", "Actionable warnings", "Trust score 0-100"],
    failureConditions: ["No evidence to assess"],
    fallback: ["Rule-based verification from evidence + source domains"],
  },
  async execute(input: VerificationInput): Promise<AgentRunResult<VerificationOutput>> {
    const { verification, usedLiveAi, model } = await generateVerification(input.opportunity);
    return {
      agentName: AGENT_NAME,
      version: VERSION,
      output: { verification },
      confidence: {
        confidenceScore: verification.verificationScore,
        confidenceReasons: [
          `${verification.verifiedClaims.length} verified · ${verification.sourceDomains.length} source domain(s)`,
        ],
        assumptions: usedLiveAi ? [] : ["Rule-based verification (no live AI)"],
        missingInformation: verification.warnings,
      },
      evidence: input.opportunity.evidence?.slice(0, 8) ?? [],
      model,
      estimatedCostUsd: usedLiveAi && model === "gemini" ? 0.01 : 0,
    };
  },
};
