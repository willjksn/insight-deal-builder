import { callGeminiJsonText } from "@/lib/ai/geminiClient";
import { aiUsesMock } from "@/lib/ai/mockAi";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { OpportunityVerification } from "@/lib/revenueOpportunities/types/opportunity";

export const VERIFICATION_SYSTEM = `You are a verification analyst for a sales-opportunity system. Given a business subject plus the evidence and observed facts gathered about it, assess how trustworthy the record is BEFORE it advances to outreach.

Return JSON only:
{
  "verifiedClaims": ["claims well-supported by a cited source URL"],
  "unverifiedClaims": ["assertions with no supporting source, or that look invented"],
  "warnings": ["specific trust concerns — thin sourcing, single domain, stale info, unverified contact"],
  "verificationScore": 0,
  "status": "verified|needs_review|unverified"
}

Rules:
- Only treat a claim as verified when a real source URL supports it.
- Be skeptical: if evidence is thin or from a single domain, lower the score and set needs_review or unverified.
- verificationScore is 0-100. status: >=75 verified, 45-74 needs_review, <45 unverified.
- Never invent sources. Flag anything that appears fabricated.`;

function hostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Deterministic, rule-based verification used as mock + fallback. */
export function computeRuleVerification(opportunity: RevenueOpportunity): OpportunityVerification {
  const evidence = opportunity.evidence ?? [];
  const withSource = evidence.filter((e) => e.sourceUrl && /^https?:\/\//i.test(e.sourceUrl));
  const verifiedClaims = withSource.map((e) => e.claim).filter(Boolean);
  const sourceDomains = Array.from(
    new Set(withSource.map((e) => hostname(e.sourceUrl)).filter((h): h is string => Boolean(h)))
  );

  const backed = new Set(verifiedClaims.map((c) => c.toLowerCase()));
  const unverifiedClaims = (opportunity.research?.observedFacts ?? []).filter(
    (f) => !backed.has(f.toLowerCase())
  );

  const warnings: string[] = [];
  if (evidence.length === 0) warnings.push("No evidence attached");
  if (sourceDomains.length === 1) warnings.push("Evidence relies on a single source domain");
  if (!opportunity.subject.website) warnings.push("No website found for the subject");
  const hasContact = Boolean(
    opportunity.contact?.email || opportunity.contact?.phone || opportunity.subject.publicEmail
  );
  if (hasContact && opportunity.contact?.verificationStatus !== "verified") {
    warnings.push("Contact details are unverified");
  }

  let score = 0;
  score += Math.min(50, verifiedClaims.length * 12);
  score += Math.min(25, sourceDomains.length * 12);
  if (opportunity.subject.website) score += 10;
  const avgConfidence =
    withSource.length > 0
      ? withSource.reduce((sum, e) => sum + (e.confidence ?? 0), 0) / withSource.length
      : 0;
  if (avgConfidence >= 0.7) score += 15;
  const verificationScore = Math.max(0, Math.min(100, Math.round(score)));

  const status: OpportunityVerification["status"] =
    verificationScore >= 75 ? "verified" : verificationScore >= 45 ? "needs_review" : "unverified";

  return {
    status,
    verificationScore,
    verifiedClaims,
    unverifiedClaims,
    warnings,
    sourceDomains,
    generatedAt: new Date().toISOString(),
    source: "rules",
  };
}

function strArray(v: unknown, max = 12): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, max);
}

export async function generateVerification(
  opportunity: RevenueOpportunity
): Promise<{ verification: OpportunityVerification; usedLiveAi: boolean; model: string }> {
  const rules = computeRuleVerification(opportunity);
  if (aiUsesMock()) {
    return { verification: rules, usedLiveAi: false, model: "mock" };
  }

  const evidenceLines = (opportunity.evidence ?? [])
    .slice(0, 20)
    .map((e) => `- ${e.claim} [${e.sourceUrl ?? "no source"}] (confidence ${e.confidence ?? "?"})`);

  const userPrompt = [
    `Subject: ${opportunity.subject.name}`,
    opportunity.subject.website ? `Website: ${opportunity.subject.website}` : "",
    [opportunity.subject.industry, opportunity.subject.city, opportunity.subject.state]
      .filter(Boolean)
      .join(" · "),
    "",
    "Evidence:",
    ...(evidenceLines.length ? evidenceLines : ["(none)"]),
    "",
    opportunity.research?.observedFacts?.length
      ? `Observed facts:\n${opportunity.research.observedFacts.map((f) => `- ${f}`).join("\n")}`
      : "",
    "",
    "Assess verification as the requested JSON.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const raw = (await callGeminiJsonText(VERIFICATION_SYSTEM, userPrompt)) as Record<string, unknown>;
    const scoreRaw = typeof raw.verificationScore === "number" ? raw.verificationScore : Number(raw.verificationScore);
    const verificationScore = Number.isFinite(scoreRaw)
      ? Math.max(0, Math.min(100, Math.round(scoreRaw)))
      : rules.verificationScore;
    const status =
      raw.status === "verified" || raw.status === "needs_review" || raw.status === "unverified"
        ? raw.status
        : verificationScore >= 75
          ? "verified"
          : verificationScore >= 45
            ? "needs_review"
            : "unverified";
    return {
      verification: {
        status,
        verificationScore,
        verifiedClaims: strArray(raw.verifiedClaims),
        unverifiedClaims: strArray(raw.unverifiedClaims),
        warnings: strArray(raw.warnings),
        sourceDomains: rules.sourceDomains,
        generatedAt: new Date().toISOString(),
        source: "ai",
      },
      usedLiveAi: true,
      model: "gemini",
    };
  } catch {
    return { verification: rules, usedLiveAi: false, model: "rules-fallback" };
  }
}
