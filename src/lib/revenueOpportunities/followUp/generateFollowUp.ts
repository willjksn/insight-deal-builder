import { callGeminiJsonText } from "@/lib/ai/geminiClient";
import { aiUsesMock } from "@/lib/ai/mockAi";
import type { OpportunityFollowUpPlan, RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";

export const FOLLOW_UP_SYSTEM = `You plan a single, well-timed follow-up for a sales opportunity in a video/photo production + creator business.

Return JSON only:
{
  "channel": "email|call|social|other",
  "angle": "one sentence on the angle/hook for this follow-up",
  "draftMessage": "a short, specific 2-4 sentence follow-up message"
}

Rules:
- Ground the angle in the opportunity's real context (recent activity, prior outreach, known facts).
- Never invent prices, dates, deliverables, or commitments.
- Keep it concise, warm, and specific — not a generic template.`;

function coerceChannel(v: unknown): OpportunityFollowUpPlan["channel"] {
  return v === "email" || v === "call" || v === "social" || v === "other" ? v : "email";
}

function cleanStr(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

function daysUntil(iso?: string): number | undefined {
  if (!iso) return undefined;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return undefined;
  return Math.round((t - Date.now()) / 86_400_000);
}

/** Deterministic due/timing computation (mock + fallback). */
export function computeRuleFollowUp(opportunity: RevenueOpportunity): OpportunityFollowUpPlan {
  const dueInDays = daysUntil(opportunity.workflow.followUpAt);
  const due = dueInDays == null ? false : dueInDays <= 0;
  const channel: OpportunityFollowUpPlan["channel"] =
    opportunity.contact?.email ? "email" : opportunity.contact?.phone ? "call" : "email";
  return {
    due,
    dueInDays,
    channel,
    angle: opportunity.workflow.nextAction
      ? `Next action on file: ${opportunity.workflow.nextAction}`
      : "Check in and keep the conversation warm.",
    generatedAt: new Date().toISOString(),
    source: "rules",
  };
}

export async function generateFollowUp(
  opportunity: RevenueOpportunity
): Promise<{ followUp: OpportunityFollowUpPlan; usedLiveAi: boolean; model: string }> {
  const rules = computeRuleFollowUp(opportunity);
  if (aiUsesMock()) {
    return { followUp: rules, usedLiveAi: false, model: "mock" };
  }

  const recentActivity = opportunity.activityLog
    .slice(-5)
    .map((a) => `- ${a.type}: ${a.message}`)
    .join("\n");

  const userPrompt = [
    `Subject: ${opportunity.subject.name}`,
    `Pipeline stage: ${opportunity.workflow.pipelineStage}`,
    opportunity.workflow.nextAction ? `Next action: ${opportunity.workflow.nextAction}` : "",
    rules.dueInDays != null ? `Follow-up due in ${rules.dueInDays} day(s)` : "No follow-up date set",
    opportunity.contact?.name ? `Contact: ${opportunity.contact.name}` : "",
    "",
    recentActivity ? `Recent activity:\n${recentActivity}` : "",
    "",
    "Plan the follow-up as the requested JSON.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const raw = (await callGeminiJsonText(FOLLOW_UP_SYSTEM, userPrompt)) as Record<string, unknown>;
    return {
      followUp: {
        due: rules.due,
        dueInDays: rules.dueInDays,
        channel: coerceChannel(raw.channel),
        angle: cleanStr(raw.angle) ?? rules.angle,
        draftMessage: cleanStr(raw.draftMessage),
        generatedAt: new Date().toISOString(),
        source: "ai",
      },
      usedLiveAi: true,
      model: "gemini",
    };
  } catch {
    return { followUp: rules, usedLiveAi: false, model: "rules-fallback" };
  }
}
