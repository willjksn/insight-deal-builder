import type { AgentDefinition, AgentRunResult } from "@/lib/revenueOpportunities/agents/instruction";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { OpportunityQualityReview } from "@/lib/revenueOpportunities/types/opportunity";

export interface RevisionInput {
  opportunity: RevenueOpportunity;
  qualityReview?: OpportunityQualityReview;
}

export interface RevisionOutput {
  revisionNotes: string[];
  suggestedFieldUpdates: Record<string, string>;
  readyForReReview: boolean;
}

const AGENT_NAME = "revision";
const VERSION = "0.1.0-stub";

export const revisionAgent: AgentDefinition<RevisionInput, RevisionOutput> = {
  name: AGENT_NAME,
  version: VERSION,
  instruction: {
    agentName: AGENT_NAME,
    version: VERSION,
    role: "Revision agent",
    goal: "Suggest corrections when quality review fails or confidence is low.",
    context: "Consumes quality review output and proposes field-level fixes for human approval.",
    tools: [],
    constraints: ["Never auto-modify Firestore records", "Propose changes only", "Preserve original evidence"],
    process: [
      "Read quality review issues and warnings",
      "Map each issue to a recommended correction",
      "Prioritize contact and evidence gaps",
    ],
    outputSchema: "RevisionOutput { revisionNotes, suggestedFieldUpdates, readyForReReview }",
    successCriteria: ["Actionable correction list", "All blocking issues addressed in suggestions"],
    failureConditions: ["No quality review input and no detectable issues"],
    fallback: ["Return generic research checklist"],
  },
  async execute(input: RevisionInput): Promise<AgentRunResult<RevisionOutput>> {
    const { opportunity, qualityReview } = input;
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
      revisionNotes.push("No revisions required — opportunity meets stub quality thresholds");
    }

    const readyForReReview =
      Boolean(review?.issues?.length) === false &&
      (opportunity.evidence?.length ?? 0) > 0 &&
      Boolean(opportunity.subject.industry);

    return {
      agentName: AGENT_NAME,
      version: VERSION,
      output: { revisionNotes, suggestedFieldUpdates, readyForReReview },
      confidence: {
        confidenceScore: readyForReReview ? 80 : 55,
        confidenceReasons: readyForReReview
          ? ["Corrections appear complete for stub review"]
          : ["Additional human research likely needed"],
        assumptions: ["Stub agent — suggestions only, no auto-apply"],
        missingInformation: review?.verificationWarnings ?? [],
      },
      evidence: [],
      model: "stub-rules",
      estimatedCostUsd: 0,
    };
  },
};
