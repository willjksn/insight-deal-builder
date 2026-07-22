import { callGeminiJsonText } from "@/lib/ai/geminiClient";
import { aiUsesMock } from "@/lib/ai/mockAi";
import { tavilySearch, formatTavilyResultsForPrompt } from "@/lib/search/tavilyClient";
import type {
  OpportunitySignal,
  OpportunitySignals,
  RevenueOpportunity,
} from "@/lib/revenueOpportunities/types/opportunity";

export const SIGNAL_SYSTEM = `You detect buying/timing signals about a business from recent web research, to judge whether NOW is a good moment to engage for a video/photo production or brand-partnership pitch.

Return JSON only:
{
  "signals": [
    {
      "type": "funding|hiring|expansion|launch|event|leadership|press|other",
      "summary": "one concrete, dated fact",
      "sourceUrl": "the page it came from",
      "recency": "e.g. '3 weeks ago' or '2026-06' if known",
      "strength": "low|medium|high"
    }
  ],
  "timingScore": 0,
  "recommendation": "one sentence on whether/why to engage now"
}

Rules:
- ONLY report signals that appear in the provided sources with a URL. Never invent events, dates, or funding.
- Prefer recent, concrete triggers (a launch, a raise, a new location, a hire, an award).
- timingScore is 0-100: higher when there are strong, recent, relevant triggers.
- If nothing material is found, return an empty signals array and a low timingScore.`;

const SIGNAL_TYPES = new Set<OpportunitySignal["type"]>([
  "funding",
  "hiring",
  "expansion",
  "launch",
  "event",
  "leadership",
  "press",
  "other",
]);

function coerceStrength(v: unknown): OpportunitySignal["strength"] {
  return v === "high" || v === "medium" || v === "low" ? v : "medium";
}

function cleanStr(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

/** Rule fallback: surface any "why now" signals already gathered during research. */
export function computeRuleSignals(opportunity: RevenueOpportunity): OpportunitySignals {
  const whyNow = opportunity.research?.whyNowSignals ?? [];
  const growth = opportunity.research?.growthSignals ?? [];
  const facts = [...whyNow, ...growth];
  const signals: OpportunitySignal[] = facts.slice(0, 8).map((summary) => ({
    type: "other",
    summary,
    strength: whyNow.includes(summary) ? "medium" : "low",
  }));
  const timingScore = Math.min(60, signals.length * 15);
  return {
    signals,
    timingScore,
    recommendation: signals.length
      ? "Based on previously researched signals; run live research for fresh triggers."
      : "No timing signals on record yet.",
    generatedAt: new Date().toISOString(),
    source: "rules",
  };
}

export async function generateSignals(
  opportunity: RevenueOpportunity
): Promise<{ signals: OpportunitySignals; usedLiveAi: boolean; model: string }> {
  if (aiUsesMock()) {
    return { signals: computeRuleSignals(opportunity), usedLiveAi: false, model: "mock" };
  }

  const loc = [opportunity.subject.city, opportunity.subject.state].filter(Boolean).join(" ");
  const query = [
    opportunity.subject.name,
    loc,
    opportunity.subject.industry ?? "",
    "news OR funding OR expansion OR hiring OR launch OR event 2026",
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  try {
    const search = await tavilySearch(query, { maxResults: 8, searchDepth: "advanced", includeAnswer: true });
    if (search.results.length === 0) {
      return { signals: computeRuleSignals(opportunity), usedLiveAi: false, model: "rules-fallback" };
    }

    const userPrompt = [
      `Business: ${opportunity.subject.name}`,
      loc,
      opportunity.subject.industry ? `Industry: ${opportunity.subject.industry}` : "",
      opportunity.subject.website ? `Website: ${opportunity.subject.website}` : "",
      "",
      "=== WEB RESEARCH (via Tavily) ===",
      formatTavilyResultsForPrompt(search, { maxSnippetChars: 1200, maxResults: 10 }),
      "",
      "Detect timing signals as the requested JSON.",
    ]
      .filter(Boolean)
      .join("\n");

    const raw = (await callGeminiJsonText(SIGNAL_SYSTEM, userPrompt)) as Record<string, unknown>;
    const rawSignals = Array.isArray(raw.signals) ? raw.signals : [];
    const signals: OpportunitySignal[] = rawSignals
      .map((s): OpportunitySignal | null => {
        const o = (s ?? {}) as Record<string, unknown>;
        const summary = cleanStr(o.summary);
        if (!summary) return null;
        const type = SIGNAL_TYPES.has(o.type as OpportunitySignal["type"])
          ? (o.type as OpportunitySignal["type"])
          : "other";
        return {
          type,
          summary,
          sourceUrl: cleanStr(o.sourceUrl),
          recency: cleanStr(o.recency),
          strength: coerceStrength(o.strength),
        };
      })
      .filter((s): s is OpportunitySignal => s !== null)
      .slice(0, 10);

    const scoreRaw = typeof raw.timingScore === "number" ? raw.timingScore : Number(raw.timingScore);
    const timingScore = Number.isFinite(scoreRaw) ? Math.max(0, Math.min(100, Math.round(scoreRaw))) : 0;

    return {
      signals: {
        signals,
        timingScore,
        recommendation: cleanStr(raw.recommendation),
        generatedAt: new Date().toISOString(),
        source: "ai",
      },
      usedLiveAi: true,
      model: "gemini",
    };
  } catch {
    return { signals: computeRuleSignals(opportunity), usedLiveAi: false, model: "rules-fallback" };
  }
}
