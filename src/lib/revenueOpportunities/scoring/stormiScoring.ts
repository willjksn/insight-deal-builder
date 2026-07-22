/**
 * Stormi brand-partnership opportunity scoring — 100-point model (spec Part 14).
 *
 * Distinct from the IMG client model: it rewards brand/creator fit, audience
 * alignment, and IMG production upside rather than local commercial-video demand.
 */

export const STORMI_SCORE_WEIGHTS: Record<string, number> = {
  brandFit: 20, // aligns with Stormi niche (beauty/fashion/lifestyle/travel/wellness/auto)
  audienceAlignment: 15, // brand audience matches Stormi's audience
  creatorProgramReadiness: 15, // already runs influencer/UGC/ambassador programs
  productionUpside: 15, // room for IMG to produce hero/branded content
  budgetSignals: 10, // evidence of paid partnership budget
  timingSignals: 10, // launch, seasonal campaign, new market
  geographicFit: 5, // reachable / travel-viable
  brandSafety: 5, // not a disallowed/off-brand category
  contactability: 5, // reachable decision-maker / partnerships contact
};

export function calculateStormiOpportunityScore(categoryScores: Record<string, number>): {
  totalScore: number;
  categoryScores: Record<string, number>;
} {
  let total = 0;
  const normalized: Record<string, number> = {};

  for (const [key, weight] of Object.entries(STORMI_SCORE_WEIGHTS)) {
    const raw = categoryScores[key] ?? 0;
    const clamped = Math.min(weight, Math.max(0, Math.round(raw)));
    normalized[key] = clamped;
    total += clamped;
  }

  return { totalScore: Math.min(100, total), categoryScores: normalized };
}

export function stormiScoreThreshold(
  totalScore: number
): "high" | "qualified" | "review" | "reject" {
  if (totalScore >= 85) return "high";
  if (totalScore >= 70) return "qualified";
  if (totalScore >= 55) return "review";
  return "reject";
}
