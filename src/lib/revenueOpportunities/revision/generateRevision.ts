import { callGeminiJsonText } from "@/lib/ai/geminiClient";
import { aiUsesMock } from "@/lib/ai/mockAi";
import type { OpportunityQualityReview, RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import { REVISION_SYSTEM } from "@/lib/revenueOpportunities/quality/prompts";
import { parseRevisionAi } from "@/lib/revenueOpportunities/revision/parseRevision";
import { runRuleRevision, type RuleRevisionResult } from "@/lib/revenueOpportunities/revision/ruleRevision";

export async function generateRevisionSuggestions(
  opportunity: RevenueOpportunity,
  qualityReview?: OpportunityQualityReview
): Promise<{
  result: RuleRevisionResult;
  usedLiveAi: boolean;
  model: string;
}> {
  const review = qualityReview ?? opportunity.qualityReview;
  const rules = runRuleRevision(opportunity, review);
  if (aiUsesMock()) {
    return { result: rules, usedLiveAi: false, model: "stub-rules" };
  }

  const userPrompt = [
    `Subject: ${opportunity.subject.name}`,
    opportunity.subject.industry ? `Industry: ${opportunity.subject.industry}` : "Industry: missing",
    opportunity.subject.website ? `Website: ${opportunity.subject.website}` : "",
    `Evidence count: ${opportunity.evidence?.length ?? 0}`,
    opportunity.campaignConcept?.title
      ? `Campaign concept: ${opportunity.campaignConcept.title}`
      : "Campaign concept: missing",
    opportunity.contact?.email || opportunity.subject.publicEmail
      ? `Contact: ${opportunity.contact?.email ?? opportunity.subject.publicEmail}`
      : "Contact: missing",
    "Quality review:\n" +
      JSON.stringify(
        review ?? {
          status: "pending",
          issues: [],
          verificationWarnings: [],
          recommendedCorrections: [],
        }
      ),
    "Rule-based suggestions (refine or replace):\n" + JSON.stringify(rules.suggestion),
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const raw = await callGeminiJsonText(REVISION_SYSTEM, userPrompt);
    const parsed = parseRevisionAi(raw);
    if (!parsed) {
      return { result: rules, usedLiveAi: true, model: "gemini+rules-fallback" };
    }
    return {
      result: {
        suggestion: parsed.suggestion,
        confidenceScore: parsed.confidenceScore,
        confidenceReasons:
          parsed.confidenceReasons.length > 0
            ? parsed.confidenceReasons
            : ["AI revision suggestions generated"],
      },
      usedLiveAi: true,
      model: "gemini",
    };
  } catch {
    return { result: rules, usedLiveAi: true, model: "gemini-error+rules-fallback" };
  }
}
