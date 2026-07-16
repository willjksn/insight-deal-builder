import { summarizeWebResearch } from "@/lib/search/researchSummarize";
import { tavilySearch } from "@/lib/search/tavilyClient";
import type { RevenueCampaign } from "@/lib/revenueOpportunities/types/campaign";
import {
  buildCampaignContextLines,
  buildImgResearchQuery,
  buildStormiResearchQuery,
} from "@/lib/revenueOpportunities/research/buildQuery";
import { mockProspectsForCampaign } from "@/lib/revenueOpportunities/research/mockProspects";
import { parseResearchProspects, type ParsedResearchProspect } from "@/lib/revenueOpportunities/research/parseResearch";
import { IMG_RESEARCH_SYSTEM, STORMI_RESEARCH_SYSTEM } from "@/lib/revenueOpportunities/research/prompts";
import { revenueResearchLive } from "@/lib/revenueOpportunities/research/mode";

export interface ResearchPassResult {
  prospects: ParsedResearchProspect[];
  searchQuery: string;
  usedLiveSearch: boolean;
  usedLiveAi: boolean;
}

export async function runImgResearchPass(campaign: RevenueCampaign): Promise<ResearchPassResult> {
  const searchQuery = buildImgResearchQuery(campaign);
  if (!revenueResearchLive()) {
    return {
      prospects: mockProspectsForCampaign(campaign),
      searchQuery,
      usedLiveSearch: false,
      usedLiveAi: false,
    };
  }

  const search = await tavilySearch(searchQuery, {
    maxResults: 8,
    searchDepth: "advanced",
    includeAnswer: true,
  });
  const raw = await summarizeWebResearch<unknown>(IMG_RESEARCH_SYSTEM, search, buildCampaignContextLines(campaign));
  let prospects = parseResearchProspects(raw);
  if (prospects.length === 0) {
    prospects = mockProspectsForCampaign(campaign);
    return { prospects, searchQuery, usedLiveSearch: true, usedLiveAi: true };
  }
  return { prospects, searchQuery, usedLiveSearch: true, usedLiveAi: true };
}

export async function runStormiResearchPass(campaign: RevenueCampaign): Promise<ResearchPassResult> {
  const searchQuery = buildStormiResearchQuery(campaign);
  if (!revenueResearchLive()) {
    return {
      prospects: mockProspectsForCampaign(campaign),
      searchQuery,
      usedLiveSearch: false,
      usedLiveAi: false,
    };
  }

  const search = await tavilySearch(searchQuery, {
    maxResults: 8,
    searchDepth: "advanced",
    includeAnswer: true,
  });
  const raw = await summarizeWebResearch<unknown>(STORMI_RESEARCH_SYSTEM, search, buildCampaignContextLines(campaign));
  let prospects = parseResearchProspects(raw);
  if (prospects.length === 0) {
    prospects = mockProspectsForCampaign(campaign);
    return { prospects, searchQuery, usedLiveSearch: true, usedLiveAi: true };
  }
  return { prospects, searchQuery, usedLiveSearch: true, usedLiveAi: true };
}

export async function runCampaignResearchPass(campaign: RevenueCampaign): Promise<ResearchPassResult> {
  return campaign.campaignType === "stormi_brand"
    ? runStormiResearchPass(campaign)
    : runImgResearchPass(campaign);
}
