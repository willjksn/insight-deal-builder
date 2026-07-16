import { FieldValue, Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import {
  REVENUE_FEEDBACK_EVENTS_COLLECTION,
  REVENUE_OPPORTUNITIES_COLLECTION,
} from "@/lib/revenueOpportunities/collections";
import { newActivity } from "@/lib/revenueOpportunities/defaults";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import { getOrderedQueryDocs } from "@/lib/revenueOpportunities/server/queryHelpers";
import type {
  OpportunityActivityEntry,
  RevenueOpportunity,
  RevenueOpportunityCreateInput,
  RevenueOpportunityUpdateInput,
} from "@/lib/revenueOpportunities/types/opportunity";
import type { RevenuePipelineStage, RevenueRejectionReason } from "@/lib/revenueOpportunities/types";
import { AppUser } from "@/lib/types";

function requireDb(): Firestore {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");
  return db;
}

function tenantCompany(appUser: AppUser): string {
  const company = appUser.company?.trim();
  if (!company) throw new RevenueOpportunityError("NOT_AUTHORIZED", "Organization company is required");
  return company;
}

/** Firestore rejects undefined anywhere in nested maps (e.g. activityLog[].metadata). */
function sanitizeActivityLog(entries: OpportunityActivityEntry[]): OpportunityActivityEntry[] {
  return entries.map((entry) => stripUndefined(entry) as OpportunityActivityEntry);
}

function opportunityWritePayload(
  input: Record<string, unknown>,
  timestamps: { createdAt?: FirebaseFirestore.FieldValue; updatedAt: FirebaseFirestore.FieldValue }
): Record<string, unknown> {
  const activityLog = input.activityLog;
  const base = stripUndefined({
    ...input,
    ...timestamps,
    ...(Array.isArray(activityLog) ? { activityLog: sanitizeActivityLog(activityLog as OpportunityActivityEntry[]) } : {}),
  });
  return base;
}

export interface ListOpportunitiesOptions {
  pipelineStage?: RevenuePipelineStage;
  campaignId?: string;
  approvalStatus?: string;
}

export async function listOpportunities(
  appUser: AppUser,
  options: ListOpportunitiesOptions = {}
): Promise<RevenueOpportunity[]> {
  const db = requireDb();
  const organizationCompany = tenantCompany(appUser);
  let q: FirebaseFirestore.Query = db
    .collection(REVENUE_OPPORTUNITIES_COLLECTION)
    .where("organizationCompany", "==", organizationCompany);

  if (options.campaignId) {
    q = q.where("campaignId", "==", options.campaignId);
  }
  if (options.pipelineStage) {
    q = q.where("workflow.pipelineStage", "==", options.pipelineStage);
  }
  if (options.approvalStatus) {
    q = q.where("workflow.approvalStatus", "==", options.approvalStatus);
  }

  const filterBase = q;
  const docs = await getOrderedQueryDocs(
    (ordered) => {
      let query = filterBase;
      if (ordered) query = query.orderBy("updatedAt", "desc");
      return query;
    },
    "updatedAt"
  );
  return docs.map((d) => serializeDoc<RevenueOpportunity>(d.id, d.data()));
}

export async function getOpportunity(appUser: AppUser, id: string): Promise<RevenueOpportunity> {
  const db = requireDb();
  const snap = await db.collection(REVENUE_OPPORTUNITIES_COLLECTION).doc(id).get();
  if (!snap.exists) throw new RevenueOpportunityError("NOT_FOUND", "Opportunity not found");
  const data = snap.data()!;
  if (data.organizationCompany !== tenantCompany(appUser)) {
    throw new RevenueOpportunityError("NOT_AUTHORIZED", "Opportunity not found");
  }
  return serializeDoc<RevenueOpportunity>(snap.id, data);
}

export async function createOpportunity(
  appUser: AppUser,
  input: RevenueOpportunityCreateInput
): Promise<RevenueOpportunity> {
  const db = requireDb();
  const organizationCompany = tenantCompany(appUser);
  const activity = input.activityLog?.length
    ? input.activityLog
    : [newActivity(appUser, "created", "Opportunity created manually")];

  const payload = opportunityWritePayload(
    {
      ...input,
      organizationCompany,
      ownerUserId: appUser.id,
      activityLog: activity,
    },
    { createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }
  );
  const ref = await db.collection(REVENUE_OPPORTUNITIES_COLLECTION).add(payload);
  const snap = await ref.get();
  return serializeDoc<RevenueOpportunity>(ref.id, snap.data()!);
}

export async function updateOpportunity(
  appUser: AppUser,
  id: string,
  input: RevenueOpportunityUpdateInput
): Promise<RevenueOpportunity> {
  const db = requireDb();
  const ref = db.collection(REVENUE_OPPORTUNITIES_COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new RevenueOpportunityError("NOT_FOUND", "Opportunity not found");
  if (existing.data()!.organizationCompany !== tenantCompany(appUser)) {
    throw new RevenueOpportunityError("NOT_AUTHORIZED", "Opportunity not found");
  }
  await ref.update(
    opportunityWritePayload({ ...input } as Record<string, unknown>, {
      updatedAt: FieldValue.serverTimestamp(),
    })
  );
  const snap = await ref.get();
  return serializeDoc<RevenueOpportunity>(snap.id, snap.data()!);
}

export async function deleteOpportunity(appUser: AppUser, id: string): Promise<void> {
  const db = requireDb();
  const ref = db.collection(REVENUE_OPPORTUNITIES_COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new RevenueOpportunityError("NOT_FOUND", "Opportunity not found");
  if (existing.data()!.organizationCompany !== tenantCompany(appUser)) {
    throw new RevenueOpportunityError("NOT_AUTHORIZED", "Opportunity not found");
  }
  await ref.delete();
}

export async function approveOpportunity(
  appUser: AppUser,
  id: string,
  notes?: string
): Promise<RevenueOpportunity> {
  const existing = await getOpportunity(appUser, id);
  const activity = [
    ...existing.activityLog,
    newActivity(appUser, "approved", notes?.trim() || "Opportunity approved", { pipelineStage: "approved" }),
  ];
  return updateOpportunity(appUser, id, {
    workflow: {
      ...existing.workflow,
      approvalStatus: "approved",
      pipelineStage: "ready_for_outreach",
      nextAction: "Prepare outreach draft",
    },
    activityLog: activity,
  });
}

export async function rejectOpportunity(
  appUser: AppUser,
  id: string,
  reason: RevenueRejectionReason,
  notes?: string,
  revisitLater?: boolean
): Promise<RevenueOpportunity> {
  const db = requireDb();
  const existing = await getOpportunity(appUser, id);
  const activity = [
    ...existing.activityLog,
    newActivity(appUser, "rejected", notes?.trim() || `Rejected: ${reason}`, { reason }),
  ];

  await db.collection(REVENUE_FEEDBACK_EVENTS_COLLECTION).add(
    stripUndefined({
      organizationCompany: tenantCompany(appUser),
      opportunityId: id,
      campaignId: existing.campaignId,
      reason,
      notes: notes?.trim(),
      userId: appUser.id,
      createdAt: FieldValue.serverTimestamp(),
    })
  );

  return updateOpportunity(appUser, id, {
    workflow: {
      ...existing.workflow,
      approvalStatus: "rejected",
      pipelineStage: revisitLater ? "revisit_later" : "lost",
      ...(revisitLater ? { nextAction: "Revisit in 90 days" } : {}),
    },
    rejectionReason: reason,
    rejectionNotes: notes?.trim(),
    activityLog: activity,
  });
}
