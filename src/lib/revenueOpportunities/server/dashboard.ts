import type { RevenueDashboardSummary } from "@/lib/revenueOpportunities/types/opportunity";
import { listAgentRuns } from "@/lib/revenueOpportunities/server/agentRunner";
import { listEmailThreads } from "@/lib/revenueOpportunities/server/emailThreads";
import { listOpportunities } from "@/lib/revenueOpportunities/server/opportunities";
import { listOutreachActivities } from "@/lib/revenueOpportunities/server/outreach";
import { AppUser } from "@/lib/types";

const REPLY_CLASSIFICATIONS = new Set([
  "interested",
  "question",
  "referral",
  "scheduling",
]);

const PIPELINE_VALUE_STAGES = new Set([
  "approved",
  "ready_for_outreach",
  "contacted",
  "follow_up_due",
  "replied",
  "discovery_call",
  "proposal",
  "negotiating",
]);

export async function buildDashboardSummary(appUser: AppUser): Promise<RevenueDashboardSummary> {
  const [opportunities, threads, outreach, agentRuns] = await Promise.all([
    listOpportunities(appUser),
    listEmailThreads(appUser),
    listOutreachActivities(appUser),
    listAgentRuns(appUser, { limit: 200 }),
  ]);

  const byStage: Record<string, number> = {};
  let estimatedPipelineValue = 0;
  let revenueWon = 0;
  let approved = 0;
  let rejected = 0;

  for (const opp of opportunities) {
    const stage = opp.workflow.pipelineStage;
    byStage[stage] = (byStage[stage] ?? 0) + 1;

    if (opp.workflow.approvalStatus === "approved") approved += 1;
    if (opp.workflow.approvalStatus === "rejected") rejected += 1;

    const minVal = opp.recommendation?.estimatedMinimumValue ?? 0;
    const maxVal = opp.recommendation?.estimatedMaximumValue ?? minVal;
    const mid = minVal && maxVal ? (minVal + maxVal) / 2 : minVal || maxVal;

    if (PIPELINE_VALUE_STAGES.has(stage)) {
      estimatedPipelineValue += mid;
    }
    if (stage === "won" || stage === "converted_to_project") {
      revenueWon += maxVal || minVal;
    }
  }

  const outreachSent = outreach.filter((a) => a.status === "sent").length;
  const replySignals = threads.filter(
    (t) => t.classification && REPLY_CLASSIFICATIONS.has(t.classification)
  ).length;
  const decided = approved + rejected;
  const approvalRate = decided > 0 ? Math.round((approved / decided) * 100) : null;
  const replyRate = outreachSent > 0 ? Math.round((replySignals / outreachSent) * 100) : null;
  const aiSpendUsd = Math.round(
    agentRuns.reduce((sum, run) => sum + (run.estimatedCostUsd ?? 0), 0) * 100
  ) / 100;

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
    totalOpportunities: opportunities.length,
    approvalApproved: approved,
    approvalRejected: rejected,
    approvalRate,
    outreachSent,
    replySignals,
    replyRate,
    aiSpendUsd,
  };
}
