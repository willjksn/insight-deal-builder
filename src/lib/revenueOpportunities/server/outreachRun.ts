import { initRevenueAgents } from "@/lib/revenueOpportunities/agents";
import type { AiWriterRequest, OutreachDraftBundle } from "@/lib/revenueOpportunities/types/outreach";
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
    {
      opportunityId: opportunity.id,
      opportunitySubjectName: opportunity.subject.name,
      campaignId: opportunity.campaignId,
      source: "opportunity",
    },
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

export async function generateAiWriterForUser(
  appUser: AppUser,
  request: AiWriterRequest
): Promise<{ agentRun: RevenueAgentRun; activities: RevenueOutreachActivity[] }> {
  const brief = request.brief?.trim();
  if (!brief) {
    throw new RevenueOpportunityError("VALIDATION_FAILED", "Brief is required — describe what the email should say");
  }
  if (brief.length > 8000) {
    throw new RevenueOpportunityError("VALIDATION_FAILED", "Brief is too long (max 8000 characters)");
  }

  initRevenueAgents();

  let opportunity = null;
  if (request.opportunityId?.trim()) {
    opportunity = await getOpportunity(appUser, request.opportunityId.trim());
  }

  const tone = request.tone === "warm" || request.tone === "concise" ? request.tone : "professional";
  const normalized: AiWriterRequest = {
    brief,
    toEmail: request.toEmail?.trim() || undefined,
    toName: request.toName?.trim() || undefined,
    subjectHint: request.subjectHint?.trim() || undefined,
    tone,
    opportunityId: opportunity?.id,
  };

  const { run: agentRun, result } = await runRevenueAgent(
    appUser,
    "ai_writer",
    { request: normalized, opportunity },
    {
      opportunityId: opportunity?.id,
      campaignId: opportunity?.campaignId,
      inputSummary: `AI Writer: ${brief.slice(0, 120)}${brief.length > 120 ? "…" : ""}`,
    }
  );

  const bundle = result as OutreachDraftBundle;
  const emailDrafts = bundle.drafts.filter((d) => d.channel === "email");
  if (emailDrafts.length === 0) {
    throw new RevenueOpportunityError("WORKFLOW_UNAVAILABLE", "AI Writer did not return an email draft");
  }

  const activities = await createOutreachActivitiesFromDrafts(
    appUser,
    {
      opportunityId: opportunity?.id,
      opportunitySubjectName: opportunity?.subject.name ?? normalized.toName ?? "AI Writer",
      campaignId: opportunity?.campaignId,
      source: "ai_writer",
      userBrief: brief,
    },
    emailDrafts,
    agentRun.id
  );

  if (opportunity) {
    await updateOpportunity(appUser, opportunity.id, {
      activityLog: [
        ...opportunity.activityLog,
        newActivity(appUser, "outreach_generated", `AI Writer drafted ${activities.length} email(s)`, {
          agentRunId: agentRun.id,
        }),
      ],
    });
  }

  return { agentRun, activities };
}

export async function approveOutreachAndAdvancePipeline(
  appUser: AppUser,
  outreachId: string,
  notes?: string
): Promise<{ activity: RevenueOutreachActivity; opportunityUpdated: boolean }> {
  const activity = await approveOutreachActivity(appUser, outreachId, notes);

  if (!activity.opportunityId) {
    return { activity, opportunityUpdated: false };
  }

  const opportunity = await getOpportunity(appUser, activity.opportunityId);

  const allForOpp = await listOutreachActivities(appUser, { opportunityId: activity.opportunityId });
  const allApproved = allForOpp.length > 0 && allForOpp.every((a) => a.status === "approved" || a.status === "rejected");
  const anyApproved = allForOpp.some((a) => a.status === "approved");

  if (allApproved && anyApproved) {
    await updateOpportunity(appUser, activity.opportunityId, {
      workflow: {
        ...opportunity.workflow,
        pipelineStage: "contacted",
        nextAction: "Create Gmail draft from approved email outreach",
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
