import type {
  OpportunityQualityReview,
  OpportunityRevisionSuggestion,
  RevenueOpportunity,
} from "@/lib/revenueOpportunities/types/opportunity";

export interface RuleRevisionResult {
  suggestion: OpportunityRevisionSuggestion;
  confidenceScore: number;
  confidenceReasons: string[];
}

/** Deterministic revision suggestions — mock AI and live fallback. */
export function runRuleRevision(
  opportunity: RevenueOpportunity,
  qualityReview?: OpportunityQualityReview
): RuleRevisionResult {
  const revisionNotes: string[] = [];
  const suggestedFieldUpdates: Record<string, string> = {};
  const review = qualityReview ?? opportunity.qualityReview;

  if (review?.recommendedCorrections?.length) {
    revisionNotes.push(...review.recommendedCorrections);
  }
  if (review?.issues?.length) {
    for (const issue of review.issues) {
      revisionNotes.push(`Resolve: ${issue}`);
    }
  }
  if (!opportunity.subject.industry) {
    suggestedFieldUpdates["subject.industry"] = "Infer from website or manual classification";
    revisionNotes.push("Add industry to improve campaign fit scoring");
  }
  if (!opportunity.evidence?.length) {
    suggestedFieldUpdates["evidence"] = "Add homepage, social profile, or press link";
    revisionNotes.push("Attach at least one public source URL");
  }
  if (!opportunity.campaignConcept?.title) {
    suggestedFieldUpdates["campaignConcept.title"] = `Campaign concept for ${opportunity.subject.name}`;
    revisionNotes.push("Draft a campaign concept title for outreach context");
  }

  if (revisionNotes.length === 0) {
    revisionNotes.push("No revisions required — opportunity meets current quality thresholds");
  }

  const readyForReReview =
    Boolean(review?.issues?.length) === false &&
    (opportunity.evidence?.length ?? 0) > 0 &&
    Boolean(opportunity.subject.industry);

  return {
    suggestion: {
      revisionNotes,
      suggestedFieldUpdates,
      readyForReReview,
      source: "rules",
      generatedAt: new Date().toISOString(),
    },
    confidenceScore: readyForReReview ? 80 : 55,
    confidenceReasons: readyForReReview
      ? ["Corrections appear complete for rule-based review"]
      : ["Additional human research likely needed"],
  };
}
