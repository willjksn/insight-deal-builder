import { FieldValue, Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { REVENUE_OUTREACH_ACTIVITIES_COLLECTION } from "@/lib/revenueOpportunities/collections";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";
import { getOrderedQueryDocs } from "@/lib/revenueOpportunities/server/queryHelpers";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import type {
  OutreachDraftItem,
  RevenueOutreachActivity,
  RevenueOutreachSource,
  RevenueOutreachStatus,
} from "@/lib/revenueOpportunities/types/outreach";
import { AppUser } from "@/lib/types";

export type CreateOutreachMeta = {
  opportunityId?: string;
  opportunitySubjectName?: string;
  campaignId?: string;
  source?: RevenueOutreachSource;
  userBrief?: string;
};

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

export async function listOutreachActivities(
  appUser: AppUser,
  filters?: { opportunityId?: string; status?: RevenueOutreachStatus }
): Promise<RevenueOutreachActivity[]> {
  const db = requireDb();
  let q: FirebaseFirestore.Query = db
    .collection(REVENUE_OUTREACH_ACTIVITIES_COLLECTION)
    .where("organizationCompany", "==", tenantCompany(appUser));

  if (filters?.opportunityId) q = q.where("opportunityId", "==", filters.opportunityId);
  if (filters?.status) q = q.where("status", "==", filters.status);

  const docs = await getOrderedQueryDocs(
    (ordered) => {
      let query = q;
      if (ordered) query = query.orderBy("updatedAt", "desc");
      return query;
    },
    "updatedAt",
    100
  );
  return docs.map((d) => serializeDoc<RevenueOutreachActivity>(d.id, d.data()));
}

export async function getOutreachActivity(appUser: AppUser, id: string): Promise<RevenueOutreachActivity> {
  const db = requireDb();
  const snap = await db.collection(REVENUE_OUTREACH_ACTIVITIES_COLLECTION).doc(id).get();
  if (!snap.exists) throw new RevenueOpportunityError("NOT_FOUND", "Outreach draft not found");
  if (snap.data()!.organizationCompany !== tenantCompany(appUser)) {
    throw new RevenueOpportunityError("NOT_AUTHORIZED", "Outreach draft not found");
  }
  return serializeDoc<RevenueOutreachActivity>(snap.id, snap.data()!);
}

export async function createOutreachActivitiesFromDrafts(
  appUser: AppUser,
  meta: CreateOutreachMeta,
  drafts: OutreachDraftItem[],
  agentRunId?: string
): Promise<RevenueOutreachActivity[]> {
  const db = requireDb();
  const created: RevenueOutreachActivity[] = [];

  for (const draft of drafts) {
    const ref = await db.collection(REVENUE_OUTREACH_ACTIVITIES_COLLECTION).add(
      stripUndefined({
        organizationCompany: tenantCompany(appUser),
        ownerUserId: appUser.id,
        opportunityId: meta.opportunityId,
        opportunitySubjectName: meta.opportunitySubjectName,
        campaignId: meta.campaignId,
        source: meta.source ?? (meta.opportunityId ? "opportunity" : "ai_writer"),
        userBrief: meta.userBrief,
        channel: draft.channel,
        status: "pending_review",
        subject: draft.subject,
        body: draft.body,
        recipientName: draft.recipientName,
        recipientEmail: draft.recipientEmail,
        agentRunId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    );
    const snap = await ref.get();
    created.push(serializeDoc<RevenueOutreachActivity>(ref.id, snap.data()!));
  }

  return created;
}

export async function updateOutreachActivity(
  appUser: AppUser,
  id: string,
  patch: Partial<Pick<RevenueOutreachActivity, "subject" | "body" | "status" | "reviewNotes" | "recipientName" | "recipientEmail">>
): Promise<RevenueOutreachActivity> {
  const db = requireDb();
  const ref = db.collection(REVENUE_OUTREACH_ACTIVITIES_COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new RevenueOpportunityError("NOT_FOUND", "Outreach draft not found");
  if (existing.data()!.organizationCompany !== tenantCompany(appUser)) {
    throw new RevenueOpportunityError("NOT_AUTHORIZED", "Outreach draft not found");
  }
  await ref.update(stripUndefined({ ...patch, updatedAt: FieldValue.serverTimestamp() }));
  const snap = await ref.get();
  return serializeDoc<RevenueOutreachActivity>(snap.id, snap.data()!);
}

export async function approveOutreachActivity(
  appUser: AppUser,
  id: string,
  notes?: string
): Promise<RevenueOutreachActivity> {
  const db = requireDb();
  const ref = db.collection(REVENUE_OUTREACH_ACTIVITIES_COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new RevenueOpportunityError("NOT_FOUND", "Outreach draft not found");
  if (existing.data()!.organizationCompany !== tenantCompany(appUser)) {
    throw new RevenueOpportunityError("NOT_AUTHORIZED", "Outreach draft not found");
  }
  await ref.update(
    stripUndefined({
      status: "approved",
      reviewNotes: notes?.trim(),
      approvedBy: appUser.id,
      approvedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  );
  const snap = await ref.get();
  return serializeDoc<RevenueOutreachActivity>(snap.id, snap.data()!);
}

export async function rejectOutreachActivity(
  appUser: AppUser,
  id: string,
  notes?: string
): Promise<RevenueOutreachActivity> {
  return updateOutreachActivity(appUser, id, {
    status: "rejected",
    reviewNotes: notes?.trim(),
  });
}
