import { callGeminiJsonText } from "@/lib/ai/geminiClient";
import { aiUsesMock } from "@/lib/ai/mockAi";
import { tavilySearch, formatTavilyResultsForPrompt } from "@/lib/search/tavilyClient";
import type {
  FormalOpportunityMatch,
  OpportunityFormalMatches,
  RevenueOpportunity,
} from "@/lib/revenueOpportunities/types/opportunity";

export const FORMAL_SYSTEM = `You find FORMAL, structured openings that a cinematic video/photo production studio could apply to or bid on, related to a given business or its industry/region.

Return JSON only:
{
  "matches": [
    {
      "title": "name of the RFP/grant/open call",
      "kind": "rfp|tender|grant|open_call|sponsorship|job|other",
      "deadline": "date if stated, else omit",
      "requirements": ["short bullets if stated"],
      "url": "source URL",
      "fitRationale": "one sentence on why it fits video/photo production"
    }
  ]
}

Rules:
- ONLY include openings that appear in the provided sources with a URL. Never invent RFPs, grants, or deadlines.
- Prefer active openings (not closed/expired) relevant to video, photo, content, marketing, or events.
- If none are found, return {"matches": []}.`;

const FORMAL_KINDS = new Set<FormalOpportunityMatch["kind"]>([
  "rfp",
  "tender",
  "grant",
  "open_call",
  "sponsorship",
  "job",
  "other",
]);

function cleanStr(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

function strArray(v: unknown, max = 8): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, max);
}

/** No deterministic source for formal openings — rule mode returns empty. */
export function computeRuleFormalMatches(): OpportunityFormalMatches {
  return { matches: [], generatedAt: new Date().toISOString(), source: "rules" };
}

export async function generateFormalOpportunities(
  opportunity: RevenueOpportunity
): Promise<{ formal: OpportunityFormalMatches; usedLiveAi: boolean; model: string }> {
  if (aiUsesMock()) {
    return { formal: computeRuleFormalMatches(), usedLiveAi: false, model: "mock" };
  }

  const loc = [opportunity.subject.city, opportunity.subject.state].filter(Boolean).join(" ");
  const query = [
    opportunity.subject.industry ?? opportunity.subject.name,
    loc,
    "RFP OR grant OR \"request for proposal\" OR \"open call\" OR sponsorship video photography content 2026",
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  try {
    const search = await tavilySearch(query, { maxResults: 8, searchDepth: "advanced", includeAnswer: true });
    if (search.results.length === 0) {
      return { formal: computeRuleFormalMatches(), usedLiveAi: false, model: "rules-fallback" };
    }

    const userPrompt = [
      `Subject: ${opportunity.subject.name}`,
      opportunity.subject.industry ? `Industry: ${opportunity.subject.industry}` : "",
      loc,
      "",
      "=== WEB RESEARCH (via Tavily) ===",
      formatTavilyResultsForPrompt(search, { maxSnippetChars: 1200, maxResults: 10 }),
      "",
      "List formal openings as the requested JSON.",
    ]
      .filter(Boolean)
      .join("\n");

    const raw = (await callGeminiJsonText(FORMAL_SYSTEM, userPrompt)) as Record<string, unknown>;
    const rawMatches = Array.isArray(raw.matches) ? raw.matches : [];
    const matches: FormalOpportunityMatch[] = rawMatches
      .map((m): FormalOpportunityMatch | null => {
        const o = (m ?? {}) as Record<string, unknown>;
        const title = cleanStr(o.title);
        if (!title) return null;
        const kind = FORMAL_KINDS.has(o.kind as FormalOpportunityMatch["kind"])
          ? (o.kind as FormalOpportunityMatch["kind"])
          : "other";
        return {
          title,
          kind,
          deadline: cleanStr(o.deadline),
          requirements: strArray(o.requirements),
          url: cleanStr(o.url),
          fitRationale: cleanStr(o.fitRationale),
        };
      })
      .filter((m): m is FormalOpportunityMatch => m !== null)
      .slice(0, 10);

    return {
      formal: { matches, generatedAt: new Date().toISOString(), source: "ai" },
      usedLiveAi: true,
      model: "gemini",
    };
  } catch {
    return { formal: computeRuleFormalMatches(), usedLiveAi: false, model: "rules-fallback" };
  }
}
