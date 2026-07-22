import { callGeminiJsonText } from "@/lib/ai/geminiClient";
import { aiUsesMock } from "@/lib/ai/mockAi";
import { tavilySearch, formatTavilyResultsForPrompt } from "@/lib/search/tavilyClient";
import type {
  BrandOpportunityMatch,
  OpportunityBrandMatches,
  RevenueOpportunity,
} from "@/lib/revenueOpportunities/types/opportunity";

export const BRAND_SYSTEM = `You find BRAND-PARTNERSHIP openings for a creator (Stormi) — brands actively running creator collaborations, ambassador programs, or sponsored-content campaigns that fit the subject's niche.

Return JSON only:
{
  "matches": [
    {
      "brand": "brand or company name",
      "program": "name of the ambassador/partner/creator program if stated",
      "fitRationale": "one sentence on why the creator fits",
      "contactRoute": "how to apply/reach them if stated (form, email, agency)",
      "url": "source URL"
    }
  ]
}

Rules:
- ONLY include brands/programs that appear in the provided sources with a URL. Never invent programs or contacts.
- Prefer brands with an explicit creator/ambassador/partnerships program or a recent sponsored campaign.
- If none are found, return {"matches": []}.`;

function cleanStr(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

/** No deterministic source for brand programs — rule mode returns empty. */
export function computeRuleBrandMatches(): OpportunityBrandMatches {
  return { matches: [], generatedAt: new Date().toISOString(), source: "rules" };
}

export async function generateBrandOpportunities(
  opportunity: RevenueOpportunity
): Promise<{ brand: OpportunityBrandMatches; usedLiveAi: boolean; model: string }> {
  if (aiUsesMock()) {
    return { brand: computeRuleBrandMatches(), usedLiveAi: false, model: "mock" };
  }

  const niche = opportunity.subject.industry ?? opportunity.recommendation?.serviceName ?? "";
  const query = [
    niche || opportunity.subject.name,
    "brand ambassador program OR creator partnership OR influencer collaboration OR sponsored campaign 2026",
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  try {
    const search = await tavilySearch(query, { maxResults: 8, searchDepth: "advanced", includeAnswer: true });
    if (search.results.length === 0) {
      return { brand: computeRuleBrandMatches(), usedLiveAi: false, model: "rules-fallback" };
    }

    const userPrompt = [
      `Creator/subject niche: ${niche || opportunity.subject.name}`,
      "",
      "=== WEB RESEARCH (via Tavily) ===",
      formatTavilyResultsForPrompt(search, { maxSnippetChars: 1200, maxResults: 10 }),
      "",
      "List brand-partnership openings as the requested JSON.",
    ]
      .filter(Boolean)
      .join("\n");

    const raw = (await callGeminiJsonText(BRAND_SYSTEM, userPrompt)) as Record<string, unknown>;
    const rawMatches = Array.isArray(raw.matches) ? raw.matches : [];
    const matches: BrandOpportunityMatch[] = rawMatches
      .map((m): BrandOpportunityMatch | null => {
        const o = (m ?? {}) as Record<string, unknown>;
        const brand = cleanStr(o.brand);
        if (!brand) return null;
        return {
          brand,
          program: cleanStr(o.program),
          fitRationale: cleanStr(o.fitRationale),
          contactRoute: cleanStr(o.contactRoute),
          url: cleanStr(o.url),
        };
      })
      .filter((m): m is BrandOpportunityMatch => m !== null)
      .slice(0, 10);

    return {
      brand: { matches, generatedAt: new Date().toISOString(), source: "ai" },
      usedLiveAi: true,
      model: "gemini",
    };
  } catch {
    return { brand: computeRuleBrandMatches(), usedLiveAi: false, model: "rules-fallback" };
  }
}
