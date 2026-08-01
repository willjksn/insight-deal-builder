import { FieldValue, Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { PRODUCTION_BOARDS_COLLECTION } from "@/lib/firebase/productionRepos";
import type { ProductionBoard } from "@/lib/production/types";
import { newActivity } from "@/lib/revenueOpportunities/defaults";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";
import {
  opportunityToProjectBackfill,
  opportunityToProjectPayload,
} from "@/lib/revenueOpportunities/opportunityToProjectPayload";
import {
  buildProductionBoardHandoff,
  mergeBoardHandoffIntoExisting,
  type RevenueBoardHandoffSummary,
} from "@/lib/revenueOpportunities/revenueProjectHandoff";
import { ensureClientFromOpportunity } from "@/lib/revenueOpportunities/server/ensureClientFromOpportunity";
import { getOpportunity, updateOpportunity } from "@/lib/revenueOpportunities/server/opportunities";
import { getProposal } from "@/lib/revenueOpportunities/server/proposals";
import { linkOpportunityMeetingsToProject } from "@/lib/revenueOpportunities/server/meetings";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { Project } from "@/lib/types";
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
  productionBoardId?: string;
  handoff?: RevenueBoardHandoffSummary;
}

async function getBoardForProject(
  db: Firestore,
  projectId: string
): Promise<ProductionBoard | null> {
  const q = await db
    .collection(PRODUCTION_BOARDS_COLLECTION)
    .where("projectId", "==", projectId)
    .limit(1)
    .get();
  if (q.empty) return null;
  const docSnap = q.docs[0];
  return { id: docSnap.id, ...(docSnap.data() as Omit<ProductionBoard, "id">) };
}

async function seedProductionBoardHandoff(params: {
  db: Firestore;
  projectId: string;
  ownerUserId: string;
  opportunity: RevenueOpportunity;
  proposal: Awaited<ReturnType<typeof getProposal>> | undefined;
  projectName?: string;
}): Promise<{ productionBoardId: string; handoff: RevenueBoardHandoffSummary }> {
  const { db, projectId, ownerUserId, opportunity, proposal, projectName } = params;
  const projectSnap = await db.collection("projects").doc(projectId).get();
  if (!projectSnap.exists) {
    throw new Error("Project missing after conversion");
  }
  const project = {
    id: projectSnap.id,
    ...projectSnap.data(),
  } as Project;

  const { board, summary } = buildProductionBoardHandoff({
    project: {
      ...project,
      projectName:
        projectName?.trim() || project.projectName || opportunity.subject.name,
    },
    ownerUserId,
    opportunity,
    proposal,
  });

  const existing = await getBoardForProject(db, projectId);
  if (!existing) {
    const ref = await db.collection(PRODUCTION_BOARDS_COLLECTION).add(
      stripUndefined({
        ...board,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    );
    return { productionBoardId: ref.id, handoff: summary };
  }

  const patch = mergeBoardHandoffIntoExisting(existing, board);
  if (Object.keys(patch).length) {
    await db
      .collection(PRODUCTION_BOARDS_COLLECTION)
      .doc(existing.id)
      .update(
        stripUndefined({
          ...patch,
          updatedAt: FieldValue.serverTimestamp(),
        })
      );
  }
  return { productionBoardId: existing.id, handoff: summary };
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

    const payload = {
      ...opportunityToProjectPayload({
        opportunity: workingOpportunity,
        proposal,
        projectName: input.projectName,
        ownerUserId: appUser.id,
      }),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
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
      const existingData = existingProject.docs[0].data() as Partial<Project>;
      const backfill = opportunityToProjectBackfill({
        opportunity: workingOpportunity,
        proposal,
        projectName: input.projectName,
        existing: existingData,
      });
      if (Object.keys(backfill).length > 0) {
        await db.collection("projects").doc(projectId).update({
          ...backfill,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
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

    let productionBoardId: string | undefined;
    let handoff: RevenueBoardHandoffSummary | undefined;
    try {
      const seeded = await seedProductionBoardHandoff({
        db,
        projectId,
        ownerUserId: appUser.id,
        opportunity: workingOpportunity,
        proposal,
        projectName: input.projectName,
      });
      productionBoardId = seeded.productionBoardId;
      handoff = seeded.handoff;
    } catch (boardErr) {
      console.error("convertToProject: production board handoff error:", boardErr);
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
          ? "Open Prep board — scope & brief were seeded from the proposal"
          : "Add contact email on opportunity, then create agreement",
      },
      activityLog: [
        ...workingOpportunity.activityLog,
        newActivity(appUser, "project_conversion", `Converted to ShootSpine project`, {
          projectId,
          ...(workingOpportunity.clientId ? { clientId: workingOpportunity.clientId } : {}),
          ...(proposal?.id ? { proposalId: proposal.id } : {}),
          ...(meetingsLinked > 0 ? { meetingsLinked: String(meetingsLinked) } : {}),
          ...(productionBoardId ? { productionBoardId } : {}),
          ...(handoff
            ? {
                handoffDays: String(handoff.productionDays),
                handoffNotes: handoff.filmingNotes ? "yes" : "no",
              }
            : {}),
        }),
      ],
    });

    return {
      projectId,
      opportunity: updated,
      alreadyConverted: false,
      meetingsLinked,
      productionBoardId,
      handoff,
    };
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
