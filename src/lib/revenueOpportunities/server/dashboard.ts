import type { RevenueDashboardSummary } from "@/lib/revenueOpportunities/types/opportunity";
import { listOpportunities } from "@/lib/revenueOpportunities/server/opportunities";
import { AppUser } from "@/lib/types";

export async function buildDashboardSummary(appUser: AppUser): Promise<RevenueDashboardSummary> {
  const opportunities = await listOpportunities(appUser);

  const byStage: Record<string, number> = {};
  let estimatedPipelineValue = 0;
  let revenueWon = 0;

  for (const opp of opportunities) {
    const stage = opp.workflow.pipelineStage;
    byStage[stage] = (byStage[stage] ?? 0) + 1;

    const minVal = opp.recommendation?.estimatedMinimumValue ?? 0;
    const maxVal = opp.recommendation?.estimatedMaximumValue ?? minVal;
    const mid = minVal && maxVal ? (minVal + maxVal) / 2 : minVal || maxVal;

    if (["approved", "ready_for_outreach", "contacted", "follow_up_due", "replied", "discovery_call", "proposal", "negotiating"].includes(stage)) {
      estimatedPipelineValue += mid;
    }
    if (stage === "won" || stage === "converted_to_project") {
      revenueWon += maxVal || minVal;
    }
  }

  const recentActivity = opportunities
    .flatMap((o) =>
      o.activityLog.map((a) => ({
        ...a,
        metadata: { ...a.metadata, opportunityId: o.id, subjectName: o.subject.name },
      }))
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 12);

  return {
    newOpportunities: byStage.new ?? 0,
    awaitingReview: (byStage.review_required ?? 0) + (byStage.researched ?? 0),
    approved: byStage.approved ?? 0,
    outreachReady: byStage.ready_for_outreach ?? 0,
    followUpsDue: byStage.follow_up_due ?? 0,
    discoveryCalls: byStage.discovery_call ?? 0,
    proposalsPending: byStage.proposal ?? 0,
    won: byStage.won ?? 0,
    awaitingProjectConversion: opportunities.filter(
      (o) => o.workflow.pipelineStage === "won" && o.projectConversion?.status !== "converted"
    ).length,
    convertedToProject: byStage.converted_to_project ?? 0,
    estimatedPipelineValue: Math.round(estimatedPipelineValue),
    revenueWon: Math.round(revenueWon),
    byStage,
    recentActivity,
  };
}
