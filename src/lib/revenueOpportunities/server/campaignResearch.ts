import { initRevenueAgents } from "@/lib/revenueOpportunities/agents";
import type { ResearchAgentOutput } from "@/lib/revenueOpportunities/agents/imgResearch";
import type { RevenueAgentName } from "@/lib/revenueOpportunities/types/agentRun";
import { newActivity } from "@/lib/revenueOpportunities/defaults";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";
import { prospectToOpportunityInput } from "@/lib/revenueOpportunities/research/prospectToOpportunity";
import { runRevenueAgent } from "@/lib/revenueOpportunities/server/agentRunner";
import { getCampaign } from "@/lib/revenueOpportunities/server/campaigns";
import {
  countCampaignRunsSince,
  createCampaignRun,
  finishCampaignRun,
  pruneCampaignRuns,
} from "@/lib/revenueOpportunities/server/campaignRuns";
import {
  createOpportunity,
  getOpportunity,
  listOpportunities,
  updateOpportunity,
} from "@/lib/revenueOpportunities/server/opportunities";
import type { RevenueCampaignRun } from "@/lib/revenueOpportunities/types/campaignRun";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { RevenueAgentRun } from "@/lib/revenueOpportunities/types/agentRun";
import { AppUser } from "@/lib/types";

function prospectKey(name: string, website?: string): string {
  const n = name.trim().toLowerCase().replace(/\s+/g, " ");
  const w = (website ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
  return w ? `${n}|${w}` : n;
}

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function startOfUtcWeek(d = new Date()): Date {
  const day = d.getUTCDay(); // 0 = Sunday
  const start = startOfUtcDay(d);
  start.setUTCDate(start.getUTCDate() - day);
  return start;
}

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

  const dailyLimit = campaign.dailyResearchLimit ?? 0;
  if (dailyLimit > 0) {
    const usedToday = await countCampaignRunsSince(appUser, campaignId, startOfUtcDay());
    if (usedToday >= dailyLimit) {
      throw new RevenueOpportunityError(
        "BUDGET_EXCEEDED",
        `Daily research limit reached (${usedToday}/${dailyLimit}). Try again tomorrow or raise the campaign limit.`,
        { details: { usedToday, dailyLimit } }
      );
    }
  }

  const weeklyLimit = campaign.weeklyResearchLimit ?? 0;
  if (weeklyLimit > 0) {
    const usedWeek = await countCampaignRunsSince(appUser, campaignId, startOfUtcWeek());
    if (usedWeek >= weeklyLimit) {
      throw new RevenueOpportunityError(
        "BUDGET_EXCEEDED",
        `Weekly research limit reached (${usedWeek}/${weeklyLimit}). Raise the campaign limit or wait until next week.`,
        { details: { usedWeek, weeklyLimit } }
      );
    }
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
    const existing = await listOpportunities(appUser, { campaignId });
    const seen = new Set(
      existing.map((o) => prospectKey(o.subject.name, o.subject.website))
    );

    let skippedDupes = 0;
    let skippedScore = 0;

    for (const prospect of pass.prospects.slice(0, maxCount)) {
      if (prospect.scoring.totalScore < campaign.minOpportunityScore) {
        skippedScore += 1;
        continue;
      }
      if (prospect.scoring.confidenceScore < campaign.minConfidenceScore) {
        skippedScore += 1;
        continue;
      }

      const key = prospectKey(prospect.subject.name, prospect.subject.website);
      if (seen.has(key)) {
        skippedDupes += 1;
        continue;
      }
      seen.add(key);

      const modeLabel = pass.usedLiveSearch ? "deep live research" : "research";
      const opp = await createOpportunity(appUser, {
        ...prospectToOpportunityInput(prospect, campaign),
        activityLog: [
          newActivity(
            appUser,
            "agent_research",
            `Discovered via ${agentName} (${modeLabel}, score ${prospect.scoring.totalScore}, confidence ${prospect.scoring.confidenceScore})`,
            {
              agentRunId: agentRun.id,
              campaignRunId: campaignRun.id,
            }
          ),
        ],
      });
      created.push(opp);
    }

    const status =
      created.length === 0
        ? "partially_completed"
        : created.length < maxCount
          ? "partially_completed"
          : "completed";

    const errorParts: string[] = [];
    if (created.length === 0) {
      if (pass.prospects.length === 0) {
        errorParts.push("No verified prospects from deep research");
      } else {
        errorParts.push("No prospects met score/confidence thresholds");
      }
      if (skippedDupes) errorParts.push(`${skippedDupes} duplicates skipped`);
      if (skippedScore) errorParts.push(`${skippedScore} below thresholds`);
    }

    campaignRun = await finishCampaignRun(campaignRun.id, {
      status,
      agentRunId: agentRun.id,
      agentName,
      opportunitiesCreated: created.length,
      opportunityIds: created.map((o) => o.id),
      searchQuery: pass.searchQuery,
      usedLiveSearch: pass.usedLiveSearch,
      usedLiveAi: pass.usedLiveAi,
      errorMessage: errorParts.length ? errorParts.join(". ") : undefined,
    });

    await pruneCampaignRuns(appUser, campaignId);

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
