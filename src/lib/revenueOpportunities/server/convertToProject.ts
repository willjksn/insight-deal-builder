import { FieldValue, Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { newActivity } from "@/lib/revenueOpportunities/defaults";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";
import { opportunityToProjectPayload } from "@/lib/revenueOpportunities/opportunityToProjectPayload";
import { ensureClientFromOpportunity } from "@/lib/revenueOpportunities/server/ensureClientFromOpportunity";
import { getOpportunity, updateOpportunity } from "@/lib/revenueOpportunities/server/opportunities";
import { getProposal } from "@/lib/revenueOpportunities/server/proposals";
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
    return { projectId: existingProjectId, opportunity, alreadyConverted: true };
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
    const projectRef = await db.collection("projects").add(payload);
    const projectId = projectRef.id;
    const convertedAt = new Date().toISOString();

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
        }),
      ],
    });

    return { projectId, opportunity: updated, alreadyConverted: false };
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
