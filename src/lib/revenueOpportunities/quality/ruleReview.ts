import type { OpportunityQualityReview, RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";

export interface RuleQualityReviewResult {
  review: OpportunityQualityReview;
  passed: boolean;
  confidenceScore: number;
  confidenceReasons: string[];
}

/** Deterministic quality checks — used for mock AI and as live fallback. */
export function runRuleQualityReview(opportunity: RevenueOpportunity): RuleQualityReviewResult {
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
    status: passed ? "passed" : "failed",
    issues,
    unsupportedClaims,
    verificationWarnings,
    recommendedCorrections,
    source: "rules",
    reviewedAt: new Date().toISOString(),
  };

  return {
    review,
    passed,
    confidenceScore: passed ? 85 : Math.max(30, 70 - issues.length * 15),
    confidenceReasons: passed
      ? ["Rule-based checks passed"]
      : [`${issues.length} blocking issue(s)`, `${verificationWarnings.length} warning(s)`],
  };
}
