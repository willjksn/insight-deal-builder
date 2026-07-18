import type { AgentDefinition, AgentRunResult } from "@/lib/revenueOpportunities/agents/instruction";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { OpportunityQualityReview } from "@/lib/revenueOpportunities/types/opportunity";
import { generateRevisionSuggestions } from "@/lib/revenueOpportunities/revision/generateRevision";
import { aiUsesMock } from "@/lib/ai/mockAi";

export interface RevisionInput {
  opportunity: RevenueOpportunity;
  qualityReview?: OpportunityQualityReview;
}

export interface RevisionOutput {
  revisionNotes: string[];
  suggestedFieldUpdates: Record<string, string>;
  readyForReReview: boolean;
  source: "rules" | "ai";
}

const AGENT_NAME = "revision";
const VERSION = "0.2.0";

export const revisionAgent: AgentDefinition<RevisionInput, RevisionOutput> = {
  name: AGENT_NAME,
  version: VERSION,
  instruction: {
    agentName: AGENT_NAME,
    version: VERSION,
    role: "Revision agent",
    goal: "Suggest corrections when quality review fails or confidence is low.",
    context: "Consumes quality review output and proposes field-level fixes for human approval.",
    tools: ["gemini"],
    constraints: ["Never auto-modify Firestore records", "Propose changes only", "Preserve original evidence"],
    process: [
      "Read quality review issues and warnings",
      "Map each issue to a recommended correction",
      "Prioritize contact and evidence gaps",
    ],
    outputSchema: "RevisionOutput { revisionNotes, suggestedFieldUpdates, readyForReReview }",
    successCriteria: ["Actionable correction list", "All blocking issues addressed in suggestions"],
    failureConditions: ["No quality review input and no detectable issues"],
    fallback: ["Return generic research checklist", "Fall back to rule-based suggestions"],
  },
  async execute(input: RevisionInput): Promise<AgentRunResult<RevisionOutput>> {
    const { result, usedLiveAi, model } = await generateRevisionSuggestions(
      input.opportunity,
      input.qualityReview
    );
    const { suggestion } = result;

    return {
      agentName: AGENT_NAME,
      version: VERSION,
      output: {
        revisionNotes: suggestion.revisionNotes,
        suggestedFieldUpdates: suggestion.suggestedFieldUpdates,
        readyForReReview: suggestion.readyForReReview,
        source: suggestion.source ?? "rules",
      },
      confidence: {
        confidenceScore: result.confidenceScore,
        confidenceReasons: result.confidenceReasons,
        assumptions: usedLiveAi
          ? aiUsesMock()
            ? ["Mock AI mode — rule suggestions only"]
            : ["Gemini suggestions only — human must apply"]
          : ["Rule-based suggestions only — human must apply"],
        missingInformation: input.qualityReview?.verificationWarnings ?? input.opportunity.qualityReview?.verificationWarnings ?? [],
      },
      evidence: [],
      model,
      estimatedCostUsd: usedLiveAi && model === "gemini" ? 0.01 : 0,
    };
  },
};
