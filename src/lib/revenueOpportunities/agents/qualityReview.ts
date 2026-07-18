import type { AgentDefinition, AgentRunResult } from "@/lib/revenueOpportunities/agents/instruction";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { OpportunityQualityReview } from "@/lib/revenueOpportunities/types/opportunity";
import { generateQualityReview } from "@/lib/revenueOpportunities/quality/generateQualityReview";
import { aiUsesMock } from "@/lib/ai/mockAi";

export interface QualityReviewInput {
  opportunity: RevenueOpportunity;
}

export interface QualityReviewOutput {
  review: OpportunityQualityReview;
  passed: boolean;
}

const AGENT_NAME = "quality_review";
const VERSION = "0.2.0";

export const qualityReviewAgent: AgentDefinition<QualityReviewInput, QualityReviewOutput> = {
  name: AGENT_NAME,
  version: VERSION,
  instruction: {
    agentName: AGENT_NAME,
    version: VERSION,
    role: "Quality review agent",
    goal: "Verify opportunity evidence, confidence, and required fields before human approval.",
    context: "Runs after research or manual entry. Flags unsupported claims and missing contact info.",
    tools: ["gemini"],
    constraints: [
      "Do not approve opportunities automatically",
      "Flag missing evidence for factual claims",
      "Require minimum confidence for outreach-ready status",
    ],
    process: [
      "Check subject name and industry",
      "Verify evidence count and source URLs",
      "Validate scoring and confidence thresholds",
      "List unsupported claims and verification warnings",
    ],
    outputSchema: "QualityReviewOutput { review, passed }",
    successCriteria: ["All critical fields present", "Evidence supports key claims", "Confidence above threshold"],
    failureConditions: ["No subject name", "Zero evidence with high factual claims", "Confidence below 50"],
    fallback: ["Mark needs_review", "Request human verification", "Fall back to rule-based checks"],
  },
  async execute(input: QualityReviewInput): Promise<AgentRunResult<QualityReviewOutput>> {
    const { result, usedLiveAi, model } = await generateQualityReview(input.opportunity);

    return {
      agentName: AGENT_NAME,
      version: VERSION,
      output: { review: result.review, passed: result.passed },
      confidence: {
        confidenceScore: result.confidenceScore,
        confidenceReasons: result.confidenceReasons,
        assumptions: usedLiveAi
          ? aiUsesMock()
            ? ["Mock AI mode — rule checks only"]
            : ["Gemini review with rule-assisted context"]
          : ["Rule-based quality checks"],
        missingInformation: result.review.verificationWarnings ?? [],
      },
      evidence: input.opportunity.evidence ?? [],
      model,
      estimatedCostUsd: usedLiveAi && model === "gemini" ? 0.01 : 0,
    };
  },
};
