import type { OpportunityQualityReview } from "@/lib/revenueOpportunities/types/opportunity";

function str(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t || undefined;
}

function strList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => str(x)).filter(Boolean) as string[];
}

function num(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : fallback;
}

export function parseQualityReviewAi(raw: unknown): {
  review: OpportunityQualityReview;
  passed: boolean;
  confidenceScore: number;
  confidenceReasons: string[];
} | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const nested = o.review && typeof o.review === "object" ? (o.review as Record<string, unknown>) : o;

  const issues = strList(nested.issues);
  const unsupportedClaims = strList(nested.unsupportedClaims);
  const verificationWarnings = strList(nested.verificationWarnings);
  const recommendedCorrections = strList(nested.recommendedCorrections);
  const statusRaw = str(nested.status);
  const passedExplicit = typeof nested.passed === "boolean" ? nested.passed : undefined;
  const passed = passedExplicit ?? (statusRaw === "passed" ? true : statusRaw === "failed" ? false : issues.length === 0);
  const status: OpportunityQualityReview["status"] = passed ? "passed" : "failed";

  // Require at least one signal so empty/junk JSON falls back to rules.
  if (
    !statusRaw &&
    passedExplicit === undefined &&
    issues.length === 0 &&
    verificationWarnings.length === 0 &&
    recommendedCorrections.length === 0
  ) {
    return null;
  }

  return {
    review: {
      status,
      issues,
      unsupportedClaims,
      verificationWarnings,
      recommendedCorrections,
      source: "ai",
      reviewedAt: new Date().toISOString(),
    },
    passed,
    confidenceScore: num(nested.confidenceScore ?? o.confidenceScore, passed ? 75 : 55),
    confidenceReasons: strList(nested.confidenceReasons ?? o.confidenceReasons),
  };
}
