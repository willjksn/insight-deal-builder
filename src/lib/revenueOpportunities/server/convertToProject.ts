import { FieldValue, Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { newActivity } from "@/lib/revenueOpportunities/defaults";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";
import { opportunityToProjectPayload } from "@/lib/revenueOpportunities/opportunityToProjectPayload";
import { ensureClientFromOpportunity } from "@/lib/revenueOpportunities/server/ensureClientFromOpportunity";
import { getOpportunity, updateOpportunity } from "@/lib/revenueOpportunities/server/opportunities";
import { getProposal } from "@/lib/revenueOpportunities/server/proposals";
import { linkOpportunityMeetingsToProject } from "@/lib/revenueOpportunities/server/meetings";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import { AppUser } from "@/lib/types";

function requireDb(): Firestore {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");
  return db;
}

export interface ConvertOpportunityToProjectInput {
  projectName?: string;
  proposalId?: string;
}

export interface ConvertOpportunityToProjectResult {
  projectId: string;
  opportunity: RevenueOpportunity;
  alreadyConverted: boolean;
  /** Number of meetings linked from the opportunity to the new project. */
  meetingsLinked: number;
}

export async function convertOpportunityToProject(
  appUser: AppUser,
  opportunityId: string,
  input: ConvertOpportunityToProjectInput = {}
): Promise<ConvertOpportunityToProjectResult> {
  const db = requireDb();
  const opportunity = await getOpportunity(appUser, opportunityId);

  const existingProjectId = opportunity.projectConversion?.shootSpineProjectId;
  if (opportunity.projectConversion?.status === "converted" && existingProjectId) {
    return { projectId: existingProjectId, opportunity, alreadyConverted: true, meetingsLinked: 0 };
  }

  let proposal;
  if (input.proposalId) {
    proposal = await getProposal(appUser, input.proposalId);
    if (proposal.opportunityId !== opportunityId) {
      throw new RevenueOpportunityError("VALIDATION_FAILED", "Proposal does not belong to this opportunity");
    }
  }

  await updateOpportunity(appUser, opportunityId, {
    projectConversion: {
      ...opportunity.projectConversion,
      status: "pending",
    },
  });

  try {
    let workingOpportunity = opportunity;
    try {
      const ensured = await ensureClientFromOpportunity(appUser, opportunity);
      workingOpportunity = ensured.opportunity;
    } catch (err) {
      if (!(err instanceof RevenueOpportunityError && err.code === "VALIDATION_FAILED")) {
        throw err;
      }
    }

    const payload = opportunityToProjectPayload({
      opportunity: workingOpportunity,
      proposal,
      projectName: input.projectName,
      ownerUserId: appUser.id,
    });
    // Idempotency guard: a prior attempt may have created the project before
    // failing mid-conversion. Reuse it instead of creating a duplicate on retry.
    let projectId: string;
    const existingProject = await db
      .collection("projects")
      .where("sourceRevenueOpportunityId", "==", opportunityId)
      .limit(1)
      .get();
    if (!existingProject.empty) {
      projectId = existingProject.docs[0].id;
    } else {
      const projectRef = await db.collection("projects").add(payload);
      projectId = projectRef.id;
    }
    const convertedAt = new Date().toISOString();

    // Bridge to production: link the opportunity's meetings to the new project
    // (link, don't copy) so production keeps full context without re-entry.
    let meetingsLinked = 0;
    try {
      meetingsLinked = await linkOpportunityMeetingsToProject(appUser, opportunityId, projectId);
    } catch (linkErr) {
      console.error("convertToProject: meeting link error:", linkErr);
    }

    const updated = await updateOpportunity(appUser, opportunityId, {
      projectConversion: {
        status: "converted",
        shootSpineProjectId: projectId,
        convertedAt,
        convertedBy: appUser.id,
      },
      clientId: workingOpportunity.clientId,
      workflow: {
        ...workingOpportunity.workflow,
        pipelineStage: "converted_to_project",
        nextAction: workingOpportunity.clientId
          ? "Open project and create agreement from proposal"
          : "Add contact email on opportunity, then create agreement",
      },
      activityLog: [
        ...workingOpportunity.activityLog,
        newActivity(appUser, "project_conversion", `Converted to ShootSpine project`, {
          projectId,
          ...(workingOpportunity.clientId ? { clientId: workingOpportunity.clientId } : {}),
          ...(proposal?.id ? { proposalId: proposal.id } : {}),
          ...(meetingsLinked > 0 ? { meetingsLinked: String(meetingsLinked) } : {}),
        }),
      ],
    });

    return { projectId, opportunity: updated, alreadyConverted: false, meetingsLinked };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Project creation failed";
    await updateOpportunity(appUser, opportunityId, {
      projectConversion: {
        ...opportunity.projectConversion,
        status: "failed",
        lastError: message,
      },
    }).catch(() => undefined);
    throw new RevenueOpportunityError("CONVERSION_FAILED", message, {
      details: { opportunityId },
    });
  }
}
