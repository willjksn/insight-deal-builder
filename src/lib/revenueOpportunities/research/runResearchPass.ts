import { summarizeWebResearch } from "@/lib/search/researchSummarize";
import { tavilySearch } from "@/lib/search/tavilyClient";
import type { RevenueCampaign } from "@/lib/revenueOpportunities/types/campaign";
import {
  buildCampaignContextLines,
  buildImgResearchQueryPlan,
  buildStormiResearchQueryPlan,
  isExcludedName,
} from "@/lib/revenueOpportunities/research/buildQuery";
import { enrichProspect } from "@/lib/revenueOpportunities/research/enrichProspect";
import { mergeTavilySearches } from "@/lib/revenueOpportunities/research/mergeSearches";
import { parseDiscoverCandidates, type ParsedResearchProspect } from "@/lib/revenueOpportunities/research/parseResearch";
import {
  IMG_DISCOVER_SYSTEM,
  STORMI_DISCOVER_SYSTEM,
} from "@/lib/revenueOpportunities/research/prompts";
import { revenueResearchLive } from "@/lib/revenueOpportunities/research/mode";
import { liveResearchRequirementsMessage } from "@/lib/revenueOpportunities/research/liveRequirements";

export interface ResearchPassResult {
  prospects: ParsedResearchProspect[];
  searchQuery: string;
  usedLiveSearch: boolean;
  usedLiveAi: boolean;
  discoverCount?: number;
  enrichedCount?: number;
}

async function runDeepResearchPass(
  campaign: RevenueCampaign,
  kind: "img" | "stormi"
): Promise<ResearchPassResult> {
  if (!revenueResearchLive()) {
    throw new Error(liveResearchRequirementsMessage());
  }

  const queries =
    kind === "stormi" ? buildStormiResearchQueryPlan(campaign) : buildImgResearchQueryPlan(campaign);

  const searches = await Promise.all(
    queries.map((query) =>
      tavilySearch(query, {
        maxResults: 8,
        searchDepth: "advanced",
        includeAnswer: true,
      })
    )
  );
  const merged = mergeTavilySearches(searches, queries.join(" | "));
  if (merged.results.length === 0) {
    throw new Error(
      "Live web search returned no results. Check Tavily quota/key or broaden the campaign industry/location."
    );
  }

  const discoverSystem = kind === "stormi" ? STORMI_DISCOVER_SYSTEM : IMG_DISCOVER_SYSTEM;
  const discoverRaw = await summarizeWebResearch<unknown>(
    discoverSystem,
    merged,
    buildCampaignContextLines(campaign)
  );
  const candidates = parseDiscoverCandidates(discoverRaw).filter(
    (c) => !isExcludedName(c.name, campaign)
  );

  if (candidates.length === 0) {
    return {
      prospects: [],
      searchQuery: queries.join(" | "),
      usedLiveSearch: true,
      usedLiveAi: true,
      discoverCount: 0,
      enrichedCount: 0,
    };
  }

  const target = Math.min(Math.max(campaign.opportunityCountRequested || 8, 4), 8);
  const shortlist = candidates.slice(0, target);
  const prospects: ParsedResearchProspect[] = [];

  for (const candidate of shortlist) {
    try {
      const enriched = await enrichProspect(candidate, campaign, kind);
      if (enriched && !isExcludedName(enriched.subject.name, campaign)) {
        prospects.push(enriched);
      }
    } catch {
      // Skip one bad enrich; keep researching the rest
    }
  }

  prospects.sort((a, b) => b.scoring.totalScore - a.scoring.totalScore);

  return {
    prospects,
    searchQuery: queries.join(" | "),
    usedLiveSearch: true,
    usedLiveAi: true,
    discoverCount: candidates.length,
    enrichedCount: prospects.length,
  };
}

export async function runImgResearchPass(campaign: RevenueCampaign): Promise<ResearchPassResult> {
  return runDeepResearchPass(campaign, "img");
}

export async function runStormiResearchPass(campaign: RevenueCampaign): Promise<ResearchPassResult> {
  return runDeepResearchPass(campaign, "stormi");
}

export async function runCampaignResearchPass(campaign: RevenueCampaign): Promise<ResearchPassResult> {
  return campaign.campaignType === "stormi_brand"
    ? runStormiResearchPass(campaign)
    : runImgResearchPass(campaign);
}
