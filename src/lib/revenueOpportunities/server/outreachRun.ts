import { initRevenueAgents } from "@/lib/revenueOpportunities/agents";
import type { OutreachDraftBundle } from "@/lib/revenueOpportunities/types/outreach";
import { newActivity } from "@/lib/revenueOpportunities/defaults";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";
import { runRevenueAgent } from "@/lib/revenueOpportunities/server/agentRunner";
import {
  approveOutreachActivity,
  createOutreachActivitiesFromDrafts,
  listOutreachActivities,
  rejectOutreachActivity,
} from "@/lib/revenueOpportunities/server/outreach";
import { getOpportunity, updateOpportunity } from "@/lib/revenueOpportunities/server/opportunities";
import type { RevenueOutreachActivity } from "@/lib/revenueOpportunities/types/outreach";
import type { RevenueAgentRun } from "@/lib/revenueOpportunities/types/agentRun";
import { AppUser } from "@/lib/types";

export async function generateOutreachForOpportunity(
  appUser: AppUser,
  opportunityId: string
): Promise<{ agentRun: RevenueAgentRun; activities: RevenueOutreachActivity[] }> {
  initRevenueAgents();
  const opportunity = await getOpportunity(appUser, opportunityId);

  if (opportunity.workflow.approvalStatus !== "approved") {
    throw new RevenueOpportunityError(
      "APPROVAL_REQUIRED",
      "Opportunity must be approved before generating outreach drafts"
    );
  }

  const { run: agentRun, result } = await runRevenueAgent(
    appUser,
    "outreach_draft",
    { opportunity },
    {
      opportunityId,
      campaignId: opportunity.campaignId,
      inputSummary: `Outreach drafts: ${opportunity.subject.name}`,
    }
  );

  const bundle = result as OutreachDraftBundle;
  const activities = await createOutreachActivitiesFromDrafts(
    appUser,
    opportunity,
    bundle.drafts,
    agentRun.id
  );

  await updateOpportunity(appUser, opportunityId, {
    workflow: {
      ...opportunity.workflow,
      pipelineStage: "ready_for_outreach",
      nextAction: "Review and approve outreach drafts",
    },
    activityLog: [
      ...opportunity.activityLog,
      newActivity(appUser, "outreach_generated", `Generated ${activities.length} outreach draft(s)`, {
        agentRunId: agentRun.id,
      }),
    ],
  });

  return { agentRun, activities };
}

export async function approveOutreachAndAdvancePipeline(
  appUser: AppUser,
  outreachId: string,
  notes?: string
): Promise<{ activity: RevenueOutreachActivity; opportunityUpdated: boolean }> {
  const activity = await approveOutreachActivity(appUser, outreachId, notes);
  const opportunity = await getOpportunity(appUser, activity.opportunityId);

  const allForOpp = await listOutreachActivities(appUser, { opportunityId: activity.opportunityId });
  const allApproved = allForOpp.length > 0 && allForOpp.every((a) => a.status === "approved" || a.status === "rejected");
  const anyApproved = allForOpp.some((a) => a.status === "approved");

  if (allApproved && anyApproved) {
    await updateOpportunity(appUser, activity.opportunityId, {
      workflow: {
        ...opportunity.workflow,
        pipelineStage: "contacted",
        nextAction: "Send approved outreach (Gmail in Phase 6)",
      },
      activityLog: [
        ...opportunity.activityLog,
        newActivity(appUser, "outreach_approved", `Approved ${activity.channel} outreach draft`, {
          outreachId: activity.id,
        }),
      ],
    });
    return { activity, opportunityUpdated: true };
  }

  return { activity, opportunityUpdated: false };
}

export async function rejectOutreachDraft(
  appUser: AppUser,
  outreachId: string,
  notes?: string
): Promise<RevenueOutreachActivity> {
  return rejectOutreachActivity(appUser, outreachId, notes);
}
