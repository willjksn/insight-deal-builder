import { callGeminiJsonText } from "@/lib/ai/geminiClient";
import { aiUsesMock } from "@/lib/ai/mockAi";
import type { OpportunityPursuit, RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";

export const PURSUIT_SYSTEM = `You are a pursuit strategist for a video/photo production + creator business. Given everything known about an opportunity, decide whether to pursue it now and lay out the next best actions.

Return JSON only:
{
  "decision": "pursue|hold|pass",
  "priority": "high|medium|low",
  "rationale": "2-3 sentences grounded ONLY in the provided data",
  "steps": ["concrete next actions in order — 3 to 6 items"]
}

Rules:
- Base the decision on fit, score, verification trust, timing signals, and pipeline stage.
- Never invent facts, prices, or contacts. If data is thin, prefer "hold" and ask for what's missing in a step.
- Keep steps concrete and sequenced (e.g., "Verify decision-maker email", "Send tailored intro referencing X").`;

function coerceDecision(v: unknown): OpportunityPursuit["decision"] {
  return v === "pursue" || v === "hold" || v === "pass" ? v : "hold";
}

function coercePriority(v: unknown): OpportunityPursuit["priority"] {
  return v === "high" || v === "medium" || v === "low" ? v : "medium";
}

function cleanStr(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

function strArray(v: unknown, max = 6): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, max);
}

/** Deterministic pursuit decision from score + verification (mock + fallback). */
export function computeRulePursuit(opportunity: RevenueOpportunity): OpportunityPursuit {
  const score = opportunity.scoring?.totalScore ?? 0;
  const verified = opportunity.verification?.status;
  const timing = opportunity.signals?.timingScore ?? 0;

  let decision: OpportunityPursuit["decision"] = "hold";
  let priority: OpportunityPursuit["priority"] = "medium";
  if (score >= 70 && verified !== "unverified") {
    decision = "pursue";
    priority = score >= 85 || timing >= 60 ? "high" : "medium";
  } else if (score < 40) {
    decision = "pass";
    priority = "low";
  }

  const steps: string[] = [];
  if (verified === "unverified" || !opportunity.verification) steps.push("Run verification to confirm the record is trustworthy");
  if (!opportunity.contact?.email && !opportunity.contact?.phone) steps.push("Find and verify a decision-maker contact");
  if (decision !== "pass") {
    steps.push("Draft a tailored outreach referencing the strongest evidence");
    steps.push("Set a follow-up date");
  } else {
    steps.push("Archive or park until stronger signals appear");
  }

  return {
    decision,
    priority,
    rationale: `Rule-based from score ${score}/100${verified ? `, verification ${verified}` : ""}${timing ? `, timing ${timing}/100` : ""}.`,
    steps,
    generatedAt: new Date().toISOString(),
    source: "rules",
  };
}

export async function generatePursuit(
  opportunity: RevenueOpportunity
): Promise<{ pursuit: OpportunityPursuit; usedLiveAi: boolean; model: string }> {
  const rules = computeRulePursuit(opportunity);
  if (aiUsesMock()) {
    return { pursuit: rules, usedLiveAi: false, model: "mock" };
  }

  const userPrompt = [
    `Subject: ${opportunity.subject.name}`,
    [opportunity.subject.industry, opportunity.subject.city, opportunity.subject.state].filter(Boolean).join(" · "),
    `Pipeline stage: ${opportunity.workflow.pipelineStage}`,
    opportunity.scoring ? `Score: ${opportunity.scoring.totalScore}/100 (confidence ${opportunity.scoring.confidenceScore})` : "Score: n/a",
    opportunity.verification ? `Verification: ${opportunity.verification.status} (${opportunity.verification.verificationScore}/100)` : "Verification: not run",
    opportunity.signals ? `Timing score: ${opportunity.signals.timingScore}/100` : "",
    opportunity.recommendation?.serviceName ? `Recommended service: ${opportunity.recommendation.serviceName}` : "",
    opportunity.contact?.email || opportunity.contact?.phone ? "Contact: on file" : "Contact: none",
    "",
    opportunity.research?.observedFacts?.length
      ? `Observed facts:\n${opportunity.research.observedFacts.slice(0, 8).map((f) => `- ${f}`).join("\n")}`
      : "",
    "",
    "Decide pursuit as the requested JSON.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const raw = (await callGeminiJsonText(PURSUIT_SYSTEM, userPrompt)) as Record<string, unknown>;
    const steps = strArray(raw.steps);
    return {
      pursuit: {
        decision: coerceDecision(raw.decision),
        priority: coercePriority(raw.priority),
        rationale: cleanStr(raw.rationale) ?? rules.rationale,
        steps: steps.length ? steps : rules.steps,
        generatedAt: new Date().toISOString(),
        source: "ai",
      },
      usedLiveAi: true,
      model: "gemini",
    };
  } catch {
    return { pursuit: rules, usedLiveAi: false, model: "rules-fallback" };
  }
}
