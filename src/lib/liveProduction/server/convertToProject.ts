import { FieldValue, Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import {
  getLiveOpportunity,
  updateLiveOpportunity,
} from "@/lib/liveProduction/server/opportunities";
import type { LiveOpportunity } from "@/lib/liveProduction/types";
import type { AppUser, Project } from "@/lib/types";

function requireDb(): Firestore {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");
  return db;
}

export async function convertLiveOpportunityToProject(
  appUser: AppUser,
  opportunityId: string,
  input?: { projectName?: string }
): Promise<{ projectId: string; opportunity: LiveOpportunity; alreadyConverted: boolean }> {
  const db = requireDb();
  const opportunity = await getLiveOpportunity(appUser, opportunityId);
  if (!opportunity) throw new Error("Opportunity not found");

  if (opportunity.projectId) {
    return {
      projectId: opportunity.projectId,
      opportunity,
      alreadyConverted: true,
    };
  }

  const existing = await db
    .collection("projects")
    .where("sourceLiveOpportunityId", "==", opportunityId)
    .limit(1)
    .get();
  if (!existing.empty) {
    const projectId = existing.docs[0].id;
    const updated = await updateLiveOpportunity(appUser, opportunityId, {
      projectId,
      status: opportunity.status === "won" ? "won" : "pursuing",
    });
    return { projectId, opportunity: updated, alreadyConverted: true };
  }

  const projectName =
    input?.projectName?.trim() ||
    `${opportunity.organizationName} — ${opportunity.title}`.slice(0, 120);
  const fee =
    opportunity.estimatedValueHigh ??
    opportunity.estimatedValueLow ??
    opportunity.financialEstimate.clientRevenueHigh ??
    0;

  const payload = stripUndefined({
    projectName,
    clientId: opportunity.clientId || "",
    clientName: opportunity.organizationName,
    agreementType: "client_project" as const,
    projectType: "Event Coverage" as Project["projectType"],
    shootType: "Photo + Video" as Project["shootType"],
    totalProjectFee: fee,
    shootDate: opportunity.eventDates || opportunity.setupDate || "",
    deliveryDate: opportunity.strikeDate || "",
    location: opportunity.venue || opportunity.location || "",
    status: "draft" as const,
    ownerUserId: appUser.id,
    sourceLiveOpportunity: true,
    sourceLiveOpportunityId: opportunityId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const ref = await db.collection("projects").add(payload);
  const updated = await updateLiveOpportunity(appUser, opportunityId, {
    projectId: ref.id,
    status: opportunity.status === "won" ? "won" : "pursuing",
  });

  return { projectId: ref.id, opportunity: updated, alreadyConverted: false };
}
