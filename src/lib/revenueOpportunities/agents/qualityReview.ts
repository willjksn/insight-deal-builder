import type { AgentDefinition, AgentRunResult } from "@/lib/revenueOpportunities/agents/instruction";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { OpportunityQualityReview } from "@/lib/revenueOpportunities/types/opportunity";

export interface QualityReviewInput {
  opportunity: RevenueOpportunity;
}

export interface QualityReviewOutput {
  review: OpportunityQualityReview;
  passed: boolean;
}

const AGENT_NAME = "quality_review";
const VERSION = "0.1.0-stub";

export const qualityReviewAgent: AgentDefinition<QualityReviewInput, QualityReviewOutput> = {
  name: AGENT_NAME,
  version: VERSION,
  instruction: {
    agentName: AGENT_NAME,
    version: VERSION,
    role: "Quality review agent",
    goal: "Verify opportunity evidence, confidence, and required fields before human approval.",
    context: "Runs after research or manual entry. Flags unsupported claims and missing contact info.",
    tools: [],
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
    fallback: ["Mark needs_review", "Request human verification"],
  },
  async execute(input: QualityReviewInput): Promise<AgentRunResult<QualityReviewOutput>> {
    const { opportunity } = input;
    const issues: string[] = [];
    const unsupportedClaims: string[] = [];
    const verificationWarnings: string[] = [];
    const recommendedCorrections: string[] = [];

    if (!opportunity.subject.name?.trim()) {
      issues.push("Subject name is missing");
    }
    if (!opportunity.subject.industry?.trim()) {
      verificationWarnings.push("Industry not specified");
      recommendedCorrections.push("Add industry classification");
    }
    if (!opportunity.evidence?.length) {
      issues.push("No evidence attached");
      recommendedCorrections.push("Add at least one source URL supporting key claims");
    } else {
      const missingUrls = opportunity.evidence.filter((e) => !e.sourceUrl?.trim());
      if (missingUrls.length > 0) {
        verificationWarnings.push(`${missingUrls.length} evidence item(s) missing source URL`);
      }
    }
    if ((opportunity.scoring?.confidenceScore ?? 0) < 50) {
      issues.push("Confidence score below minimum threshold (50)");
    }
    if ((opportunity.scoring?.totalScore ?? 0) < 55) {
      verificationWarnings.push("Total opportunity score is in human-review band");
    }
    if (opportunity.research?.aiInterpretations?.length && !opportunity.evidence?.length) {
      unsupportedClaims.push("AI interpretations present without supporting evidence");
    }
    if (!opportunity.contact?.email && !opportunity.contact?.phone && !opportunity.subject.publicEmail) {
      verificationWarnings.push("No verified contact channel identified");
      recommendedCorrections.push("Research decision-maker contact before outreach");
    }

    const passed = issues.length === 0;
    const review: OpportunityQualityReview = {
      status: passed ? "passed" : issues.length > 0 ? "failed" : "pending",
      issues,
      unsupportedClaims,
      verificationWarnings,
      recommendedCorrections,
    };

    return {
      agentName: AGENT_NAME,
      version: VERSION,
      output: { review, passed },
      confidence: {
        confidenceScore: passed ? 85 : Math.max(30, 70 - issues.length * 15),
        confidenceReasons: passed
          ? ["Rule-based checks passed"]
          : [`${issues.length} blocking issue(s)`, `${verificationWarnings.length} warning(s)`],
        assumptions: ["Stub agent — deterministic rules only until Phase 4 AI integration"],
        missingInformation: verificationWarnings,
      },
      evidence: opportunity.evidence ?? [],
      model: "stub-rules",
      estimatedCostUsd: 0,
    };
  },
};
