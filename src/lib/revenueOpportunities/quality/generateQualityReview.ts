import { callGeminiJsonText } from "@/lib/ai/geminiClient";
import { aiUsesMock } from "@/lib/ai/mockAi";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import { QUALITY_REVIEW_SYSTEM } from "@/lib/revenueOpportunities/quality/prompts";
import { parseQualityReviewAi } from "@/lib/revenueOpportunities/quality/parseQuality";
import { runRuleQualityReview, type RuleQualityReviewResult } from "@/lib/revenueOpportunities/quality/ruleReview";

export async function generateQualityReview(opportunity: RevenueOpportunity): Promise<{
  result: RuleQualityReviewResult;
  usedLiveAi: boolean;
  model: string;
}> {
  const rules = runRuleQualityReview(opportunity);
  if (aiUsesMock()) {
    return { result: rules, usedLiveAi: false, model: "stub-rules" };
  }

  const userPrompt = [
    `Subject: ${opportunity.subject.name}`,
    opportunity.subject.industry ? `Industry: ${opportunity.subject.industry}` : "",
    opportunity.subject.city ? `Location: ${opportunity.subject.city}, ${opportunity.subject.state ?? ""}` : "",
    opportunity.subject.description ? `Description: ${opportunity.subject.description}` : "",
    opportunity.subject.website ? `Website: ${opportunity.subject.website}` : "",
    `Confidence score: ${opportunity.scoring?.confidenceScore ?? "n/a"}`,
    `Total score: ${opportunity.scoring?.totalScore ?? "n/a"}`,
    opportunity.contact?.email || opportunity.subject.publicEmail
      ? `Contact email: ${opportunity.contact?.email ?? opportunity.subject.publicEmail}`
      : "Contact email: none",
    opportunity.contact?.phone ? `Contact phone: ${opportunity.contact.phone}` : "",
    opportunity.campaignConcept?.title ? `Campaign concept: ${opportunity.campaignConcept.title}` : "",
    opportunity.evidence?.length
      ? `Evidence:\n${opportunity.evidence
          .slice(0, 8)
          .map((e) => `- ${e.claim} (${e.sourceUrl || "no url"})`)
          .join("\n")}`
      : "Evidence: none",
    opportunity.research?.aiInterpretations?.length
      ? `AI interpretations: ${opportunity.research.aiInterpretations.slice(0, 5).join("; ")}`
      : "",
    "Also consider these rule findings (you may refine them):\n" +
      JSON.stringify({
        issues: rules.review.issues,
        warnings: rules.review.verificationWarnings,
        corrections: rules.review.recommendedCorrections,
      }),
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const raw = await callGeminiJsonText(QUALITY_REVIEW_SYSTEM, userPrompt);
    const parsed = parseQualityReviewAi(raw);
    if (!parsed) {
      return { result: rules, usedLiveAi: true, model: "gemini+rules-fallback" };
    }
    return {
      result: {
        review: parsed.review,
        passed: parsed.passed,
        confidenceScore: parsed.confidenceScore,
        confidenceReasons:
          parsed.confidenceReasons.length > 0
            ? parsed.confidenceReasons
            : [parsed.passed ? "AI quality review passed" : "AI quality review found issues"],
      },
      usedLiveAi: true,
      model: "gemini",
    };
  } catch {
    return { result: rules, usedLiveAi: true, model: "gemini-error+rules-fallback" };
  }
}
