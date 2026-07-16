/** IMG client opportunity scoring — 100-point model from product spec. */

export const IMG_SCORE_WEIGHTS: Record<string, number> = {
  contentOpportunity: 20,
  socialMarketingActivity: 15,
  purchasingPotential: 15,
  recurringContentPotential: 15,
  recentBusinessSignals: 10,
  creativeCinematicFit: 10,
  geographicServiceability: 5,
  stormiIntegrationPotential: 5,
  contactability: 5,
};

export function calculateImgOpportunityScore(categoryScores: Record<string, number>): {
  totalScore: number;
  categoryScores: Record<string, number>;
} {
  let total = 0;
  const normalized: Record<string, number> = {};

  for (const [key, weight] of Object.entries(IMG_SCORE_WEIGHTS)) {
    const raw = categoryScores[key] ?? 0;
    const clamped = Math.min(weight, Math.max(0, Math.round(raw)));
    normalized[key] = clamped;
    total += clamped;
  }

  return { totalScore: Math.min(100, total), categoryScores: normalized };
}

export function imgScoreThreshold(totalScore: number): "high" | "qualified" | "review" | "reject" {
  if (totalScore >= 85) return "high";
  if (totalScore >= 70) return "qualified";
  if (totalScore >= 55) return "review";
  return "reject";
}
