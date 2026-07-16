import { initRevenueAgents } from "@/lib/revenueOpportunities/agents";
import type { ResearchAgentOutput } from "@/lib/revenueOpportunities/agents/imgResearch";
import type { RevenueAgentName } from "@/lib/revenueOpportunities/types/agentRun";
import { newActivity } from "@/lib/revenueOpportunities/defaults";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";
import { prospectToOpportunityInput } from "@/lib/revenueOpportunities/research/prospectToOpportunity";
import { runRevenueAgent } from "@/lib/revenueOpportunities/server/agentRunner";
import { getCampaign } from "@/lib/revenueOpportunities/server/campaigns";
import { createCampaignRun, finishCampaignRun } from "@/lib/revenueOpportunities/server/campaignRuns";
import { createOpportunity, getOpportunity, updateOpportunity } from "@/lib/revenueOpportunities/server/opportunities";
import type { RevenueCampaignRun } from "@/lib/revenueOpportunities/types/campaignRun";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { RevenueAgentRun } from "@/lib/revenueOpportunities/types/agentRun";
import { AppUser } from "@/lib/types";

export async function runCampaignResearch(
  appUser: AppUser,
  campaignId: string
): Promise<{
  campaignRun: RevenueCampaignRun;
  agentRun: RevenueAgentRun;
  opportunities: RevenueOpportunity[];
}> {
  initRevenueAgents();
  const campaign = await getCampaign(appUser, campaignId);
  if (!campaign.active) {
    throw new RevenueOpportunityError("VALIDATION_FAILED", "Campaign must be active to run research");
  }

  const agentName: RevenueAgentName =
    campaign.campaignType === "stormi_brand" ? "stormi_research" : "img_research";

  let campaignRun = await createCampaignRun(appUser, campaign, {
    usedLiveSearch: false,
    usedLiveAi: false,
  });

  try {
    const { run: agentRun, result } = await runRevenueAgent(
      appUser,
      agentName,
      { campaign },
      {
        campaignId,
        inputSummary: `Research: ${campaign.name}`,
      }
    );

    const pass = result as ResearchAgentOutput;
    const created: RevenueOpportunity[] = [];
    const maxCount = Math.min(campaign.opportunityCountRequested, pass.prospects.length);

    for (const prospect of pass.prospects.slice(0, maxCount)) {
      if (prospect.scoring.totalScore < campaign.minOpportunityScore) continue;
      if (prospect.scoring.confidenceScore < campaign.minConfidenceScore) continue;

      const opp = await createOpportunity(appUser, {
        ...prospectToOpportunityInput(prospect, campaign),
        activityLog: [
          newActivity(appUser, "agent_research", `Discovered via ${agentName} (score ${prospect.scoring.totalScore})`, {
            agentRunId: agentRun.id,
            campaignRunId: campaignRun.id,
          }),
        ],
      });
      created.push(opp);
    }

    const status = created.length === 0 ? "partially_completed" : created.length < maxCount ? "partially_completed" : "completed";

    campaignRun = await finishCampaignRun(campaignRun.id, {
      status,
      agentRunId: agentRun.id,
      agentName,
      opportunitiesCreated: created.length,
      opportunityIds: created.map((o) => o.id),
      searchQuery: pass.searchQuery,
      usedLiveSearch: pass.usedLiveSearch,
      usedLiveAi: pass.usedLiveAi,
      errorMessage: created.length === 0 ? "No prospects met score thresholds" : undefined,
    });

    return { campaignRun, agentRun, opportunities: created };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Research failed";
    campaignRun = await finishCampaignRun(campaignRun.id, {
      status: "failed",
      opportunitiesCreated: 0,
      opportunityIds: [],
      errorMessage: message,
    });
    throw err;
  }
}

export async function runOpportunityCampaignConcept(
  appUser: AppUser,
  opportunityId: string
): Promise<{ run: RevenueAgentRun; opportunity: RevenueOpportunity }> {
  initRevenueAgents();
  const opportunity = await getOpportunity(appUser, opportunityId);
  const { run, result } = await runRevenueAgent(
    appUser,
    "campaign_concept",
    { opportunity },
    {
      opportunityId,
      campaignId: opportunity.campaignId,
      inputSummary: `Campaign concept: ${opportunity.subject.name}`,
    }
  );

  const output = result as { campaignConcept: RevenueOpportunity["campaignConcept"]; evidence?: RevenueOpportunity["evidence"] };
  const updated = await updateOpportunity(appUser, opportunityId, {
    campaignConcept: output.campaignConcept,
    evidence: output.evidence?.length ? output.evidence : opportunity.evidence,
    activityLog: [
      ...opportunity.activityLog,
      newActivity(appUser, "agent_campaign_concept", "Campaign concept generated", { runId: run.id }),
    ],
  });

  return { run, opportunity: updated };
}
