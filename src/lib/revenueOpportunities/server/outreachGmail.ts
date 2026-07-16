import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { REVENUE_OUTREACH_ACTIVITIES_COLLECTION } from "@/lib/revenueOpportunities/collections";
import { newActivity } from "@/lib/revenueOpportunities/defaults";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";
import { getEmailProviderForUser } from "@/lib/revenueOpportunities/providers/getEmailProvider";
import { getOutreachActivity } from "@/lib/revenueOpportunities/server/outreach";
import { getOpportunity, updateOpportunity } from "@/lib/revenueOpportunities/server/opportunities";
import { upsertEmailThreadFromGmail } from "@/lib/revenueOpportunities/server/emailThreads";
import type { RevenueOutreachActivity } from "@/lib/revenueOpportunities/types/outreach";
import { AppUser } from "@/lib/types";

export async function createGmailDraftFromOutreach(
  appUser: AppUser,
  outreachId: string
): Promise<{ activity: RevenueOutreachActivity; draftId: string; threadId?: string }> {
  const activity = await getOutreachActivity(appUser, outreachId);
  if (activity.status !== "approved") {
    throw new RevenueOpportunityError("APPROVAL_REQUIRED", "Outreach must be approved before creating a Gmail draft");
  }
  if (activity.channel !== "email") {
    throw new RevenueOpportunityError("VALIDATION_FAILED", "Only email outreach can be sent to Gmail");
  }

  const to = activity.recipientEmail?.trim();
  if (!to) {
    throw new RevenueOpportunityError("VALIDATION_FAILED", "Recipient email is required");
  }

  const { provider, mode, connectedEmail } = await getEmailProviderForUser(appUser);
  if (mode === "not_configured") {
    throw new RevenueOpportunityError("GMAIL_NOT_CONFIGURED", "Connect Gmail or enable mock mode to create drafts");
  }

  const draft = await provider.createDraft({
    to,
    subject: activity.subject ?? `Message for ${activity.opportunitySubjectName ?? "prospect"}`,
    body: activity.body,
  });

  const opportunity = await getOpportunity(appUser, activity.opportunityId);
  await upsertEmailThreadFromGmail(appUser, {
    gmailThreadId: draft.threadId ?? `outreach-${activity.id}`,
    subject: activity.subject ?? "Outreach draft",
    participants: [to, connectedEmail ?? "me"],
    messages: [
      {
        messageId: draft.draftId,
        from: connectedEmail ?? "me",
        to,
        subject: activity.subject ?? "",
        snippet: activity.body.slice(0, 120),
        body: activity.body,
        receivedAt: new Date().toISOString(),
        isOutbound: true,
      },
    ],
    opportunityId: activity.opportunityId,
    outreachActivityId: activity.id,
  });

  const db = getAdminDb();
  if (db) {
    await db.collection(REVENUE_OUTREACH_ACTIVITIES_COLLECTION).doc(outreachId).update({
      status: "sent",
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  await updateOpportunity(appUser, activity.opportunityId, {
    workflow: {
      ...opportunity.workflow,
      pipelineStage: "contacted",
      nextAction: mode === "mock" ? "Mock Gmail draft created — connect Gmail to send for real" : "Review Gmail draft before sending",
    },
    activityLog: [
      ...opportunity.activityLog,
      newActivity(appUser, "outreach_gmail_draft", `Created Gmail draft for ${activity.channel}`, {
        outreachId: activity.id,
        draftId: draft.draftId,
      }),
    ],
  });

  const updated = await getOutreachActivity(appUser, outreachId);
  return { activity: updated, draftId: draft.draftId, threadId: draft.threadId };
}
