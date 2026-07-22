import { summarizeWebResearch } from "@/lib/search/researchSummarize";
import { tavilySearch } from "@/lib/search/tavilyClient";
import type { RevenueCampaign } from "@/lib/revenueOpportunities/types/campaign";
import { buildEnrichContextLines } from "@/lib/revenueOpportunities/research/buildQuery";
import { mergeTavilySearches } from "@/lib/revenueOpportunities/research/mergeSearches";
import {
  parseResearchProspects,
  type DiscoverCandidate,
  type ParsedResearchProspect,
} from "@/lib/revenueOpportunities/research/parseResearch";
import { IMG_QUALIFY_SYSTEM, STORMI_QUALIFY_SYSTEM } from "@/lib/revenueOpportunities/research/prompts";

function enrichQueries(candidate: DiscoverCandidate, campaign: RevenueCampaign): string[] {
  const loc =
    [candidate.city, candidate.state].filter(Boolean).join(" ") ||
    [campaign.img?.city, campaign.img?.state].filter(Boolean).join(" ") ||
    campaign.stormi?.geographicPreference ||
    "";
  const name = candidate.name;
  const site = candidate.website?.replace(/^https?:\/\//i, "").replace(/\/$/, "");

  return [
    site
      ? `${name} ${site} about contact owner marketing`
      : `${name} ${loc} business website contact owner`,
    `${name} ${loc} Instagram TikTok Facebook video content marketing`,
    `${name} ${loc} renovation expansion grand opening hiring press news`,
  ]
    .map((q) => q.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** Deep Tavily + Gemini qualify pass for one shortlisted candidate. */
export async function enrichProspect(
  candidate: DiscoverCandidate,
  campaign: RevenueCampaign,
  kind: "img" | "stormi"
): Promise<ParsedResearchProspect | null> {
  const queries = enrichQueries(candidate, campaign).slice(0, 3);
  const searches = await Promise.all(
    queries.map((query) =>
      tavilySearch(query, {
        maxResults: 6,
        searchDepth: "advanced",
        includeAnswer: true,
      })
    )
  );
  const merged = mergeTavilySearches(searches, `enrich:${candidate.name}`);
  if (merged.results.length === 0) return null;

  const system = kind === "stormi" ? STORMI_QUALIFY_SYSTEM : IMG_QUALIFY_SYSTEM;
  const raw = await summarizeWebResearch<unknown>(
    system,
    merged,
    buildEnrichContextLines(campaign, candidate)
  );
  const prospects = parseResearchProspects(raw, kind);
  const best = prospects[0];
  if (!best) return null;

  // Prefer shortlist name/website when model drifts
  if (!best.subject.website && candidate.website) {
    best.subject.website = candidate.website;
  }
  if (candidate.city && !best.subject.city) best.subject.city = candidate.city;
  if (candidate.state && !best.subject.state) best.subject.state = candidate.state;
  if (candidate.industry && !best.subject.industry) best.subject.industry = candidate.industry;

  return best;
}
