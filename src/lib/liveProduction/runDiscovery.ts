import { callGeminiJsonText } from "@/lib/ai/geminiClient";
import { aiUsesMock } from "@/lib/ai/mockAi";
import { buildLiveDiscoveryQueries } from "@/lib/liveProduction/buildDiscoveryQueries";
import type { LiveProductionTargetProfile } from "@/lib/liveProduction/defaultsKeywords";
import type {
  LiveDiscoveryCandidate,
  LiveDiscoveryPriority,
} from "@/lib/liveProduction/discoveryTypes";
import { mockLiveDiscoveryCandidates } from "@/lib/liveProduction/mockDiscoveryCandidates";
import type { LiveOpportunitySourceKind } from "@/lib/liveProduction/types";
import { summarizeWebResearch } from "@/lib/search/researchSummarize";
import { tavilyAvailable, tavilySearch, type TavilySearchResponse } from "@/lib/search/tavilyClient";

const DISCOVER_SYSTEM = `You find LIVE PRODUCTION / AV / LED / staging / live-streaming opportunities that a production company could bid on or fulfill as a vendor or production partner.

Search coverage is WIDE — not federal-only. Include openings from:
- Cities / municipalities and town purchasing
- Counties
- State procurement / eProcurement portals
- Universities, colleges, school systems
- Convention centers, arenas, venues
- Churches and nonprofits
- Corporate / private event and experiential agencies
- Festivals and special events
- Partner / subcontract / overflow production requests (private)
- Federal (SAM.gov) only when present — do not overweight federal vs local

Return JSON only:
{
  "candidates": [
    {
      "title": string,
      "organizationName": string,
      "opportunityType": string,
      "location": string,
      "sourceUrl": string,
      "sourceKind": "sam_gov|nc_evp|state_procurement|county_procurement|city_procurement|university|venue|corporate|church|festival|partner_subcontract|partner_referral|url_import|manual",
      "bidDeadline": "YYYY-MM-DD or omit",
      "estimatedValueLow": number|null,
      "estimatedValueHigh": number|null,
      "summary": string,
      "whyFit": string,
      "servicesMentioned": string[],
      "includesLiveStreaming": boolean,
      "priority": "high|good|review"
    }
  ]
}

Rules:
- ONLY include openings supported by the provided web research with a real sourceUrl from those sources. Never invent RFPs, URLs, or deadlines.
- Prefer: event production, LED/video walls, audio/PA, lighting, truss/staging/rigging, IMAG, cameras, conference AV, concerts/festivals, church/corporate/university/municipal/county events, technical labor, equipment rental/sub-rental, and LIVE STREAMING / webcast / hybrid events.
- Mix public solicitations and private/partner opportunities when sources support them.
- Exclude permanent AV install-only, residential AV, pure software, and jobs clearly under the company's minimum unless they include streaming/production labor.
- Mark includesLiveStreaming true when livestream/webcast/hybrid stream is part of the work.
- If none are found, return {"candidates": []}.`;

function cleanStr(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

function num(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function asPriority(v: unknown): LiveDiscoveryPriority {
  const s = String(v || "").toLowerCase();
  if (s === "high" || s === "good") return s;
  return "review";
}

const SOURCE_KINDS = new Set<string>([
  "sam_gov",
  "nc_evp",
  "state_procurement",
  "county_procurement",
  "city_procurement",
  "university",
  "college",
  "venue",
  "corporate",
  "church",
  "festival",
  "partner_subcontract",
  "partner_referral",
  "url_import",
  "manual",
]);

export function inferSourceKindFromUrl(url?: string): LiveOpportunitySourceKind {
  if (!url) return "url_import";
  const u = url.toLowerCase();
  if (u.includes("sam.gov")) return "sam_gov";
  if (u.includes("evp.") || u.includes("eprocurement") || u.includes("nc.gov")) return "nc_evp";
  if (u.includes(".edu")) return "university";
  if (u.includes("church") || u.includes("ministry")) return "church";
  return "url_import";
}

function normalizeCandidate(raw: Record<string, unknown>, idx: number): LiveDiscoveryCandidate | null {
  const title = cleanStr(raw.title);
  const organizationName = cleanStr(raw.organizationName);
  if (!title || !organizationName) return null;
  const sourceUrl = cleanStr(raw.sourceUrl);
  let sourceKind = cleanStr(raw.sourceKind) as LiveOpportunitySourceKind | undefined;
  if (!sourceKind || !SOURCE_KINDS.has(sourceKind)) {
    sourceKind = inferSourceKindFromUrl(sourceUrl);
  }
  const services = Array.isArray(raw.servicesMentioned)
    ? raw.servicesMentioned.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, 12)
    : [];
  const includesLiveStreaming =
    Boolean(raw.includesLiveStreaming) ||
    services.some((s) => /stream|webcast|hybrid/i.test(s)) ||
    /stream|webcast|hybrid/i.test(`${title} ${raw.summary || ""}`);

  return {
    id: `cand_${Date.now().toString(36)}_${idx}`,
    title,
    organizationName,
    opportunityType: cleanStr(raw.opportunityType) || "Live Production",
    location: cleanStr(raw.location),
    sourceUrl,
    sourceKind,
    bidDeadline: cleanStr(raw.bidDeadline),
    estimatedValueLow: num(raw.estimatedValueLow),
    estimatedValueHigh: num(raw.estimatedValueHigh),
    summary: cleanStr(raw.summary),
    whyFit: cleanStr(raw.whyFit),
    servicesMentioned: includesLiveStreaming && !services.some((s) => /stream/i.test(s))
      ? [...services, "Live Streaming"]
      : services,
    includesLiveStreaming,
    priority: asPriority(raw.priority),
  };
}

function mergeSearches(searches: TavilySearchResponse[]): TavilySearchResponse {
  const seen = new Set<string>();
  const results: TavilySearchResponse["results"] = [];
  const answers: string[] = [];
  for (const s of searches) {
    if (s.answer?.trim()) answers.push(s.answer.trim());
    for (const r of s.results) {
      const key = r.url.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(r);
    }
  }
  return {
    query: searches.map((s) => s.query).join(" | "),
    answer: answers.slice(0, 3).join("\n\n"),
    results: results.slice(0, 28),
  };
}

export type LiveDiscoveryPassResult = {
  queries: string[];
  candidates: LiveDiscoveryCandidate[];
  usedLiveSearch: boolean;
  usedLiveAi: boolean;
};

export async function runLiveDiscoveryPass(
  profile: LiveProductionTargetProfile
): Promise<LiveDiscoveryPassResult> {
  const queries = buildLiveDiscoveryQueries(profile);

  if (aiUsesMock() || !tavilyAvailable()) {
    return {
      queries,
      candidates: mockLiveDiscoveryCandidates(profile),
      usedLiveSearch: false,
      usedLiveAi: false,
    };
  }

  // On-demand wide search: run most lanes (cities, counties, state, private, venues…).
  // Cap concurrency cost with basic depth on later queries.
  const searches = await Promise.all(
    queries.slice(0, 10).map((q, i) =>
      tavilySearch(q, {
        maxResults: i < 4 ? 6 : 5,
        searchDepth: i < 5 ? "advanced" : "basic",
        includeAnswer: i < 3,
      })
    )
  );
  const merged = mergeSearches(searches);
  if (merged.results.length === 0) {
    return {
      queries,
      candidates: [],
      usedLiveSearch: true,
      usedLiveAi: false,
    };
  }

  const contextLines = [
    `Company home: ${profile.homeLocation}`,
    `Service radius: ${profile.radiusMiles} miles`,
    `Minimum project: $${profile.minimumProject}`,
    `Preferred: $${profile.preferredProject}+`,
    `Services: ${profile.services.join(", ")}`,
    `Keywords: ${profile.keywords.slice(0, 20).join(", ")}`,
    `Exclude: ${profile.exclude.join(", ")}`,
    "This is an ON-DEMAND search (not a nightly job).",
    "Cover cities, counties, state portals, universities, venues, churches, corporate/private, festivals, partner overflow — not only SAM.gov.",
    "Prioritize Live Streaming / webcast / hybrid when present in sources.",
  ];

  try {
    const raw = await summarizeWebResearch<{ candidates?: unknown[] }>(
      DISCOVER_SYSTEM,
      merged,
      contextLines
    );
    const list = Array.isArray(raw?.candidates) ? raw.candidates : [];
    const candidates = list
      .map((row, i) => normalizeCandidate((row ?? {}) as Record<string, unknown>, i))
      .filter((c): c is LiveDiscoveryCandidate => Boolean(c))
      .slice(0, 30);

    return {
      queries,
      candidates,
      usedLiveSearch: true,
      usedLiveAi: true,
    };
  } catch {
    // Fallback: light Gemini over first search blob without full summarize helper
    try {
      const blob = merged.results
        .slice(0, 12)
        .map((r) => `${r.title}\n${r.url}\n${r.content.slice(0, 800)}`)
        .join("\n\n");
      const raw = (await callGeminiJsonText(
        DISCOVER_SYSTEM,
        [...contextLines, "", blob].join("\n")
      )) as { candidates?: unknown[] };
      const list = Array.isArray(raw?.candidates) ? raw.candidates : [];
      const candidates = list
        .map((row, i) => normalizeCandidate((row ?? {}) as Record<string, unknown>, i))
        .filter((c): c is LiveDiscoveryCandidate => Boolean(c))
        .slice(0, 30);
      return { queries, candidates, usedLiveSearch: true, usedLiveAi: true };
    } catch {
      return { queries, candidates: [], usedLiveSearch: true, usedLiveAi: false };
    }
  }
}
