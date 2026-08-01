import { FieldValue, Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { REVENUE_FOLLOW_UP_TASKS_COLLECTION } from "@/lib/revenueOpportunities/collections";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";
import { getOrderedQueryDocs } from "@/lib/revenueOpportunities/server/queryHelpers";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import { getOpportunity } from "@/lib/revenueOpportunities/server/opportunities";
import type {
  RevenueFollowUpTask,
  RevenueFollowUpTaskCreateInput,
  RevenueFollowUpTaskUpdateInput,
} from "@/lib/revenueOpportunities/types/followUpTask";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
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

async function loadOwned(appUser: AppUser, id: string) {
  const db = requireDb();
  const ref = db.collection(REVENUE_FOLLOW_UP_TASKS_COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new RevenueOpportunityError("NOT_FOUND", "Follow-up task not found");
  const task = serializeDoc<RevenueFollowUpTask>(snap.id, snap.data()!);
  if (task.organizationCompany !== tenantCompany(appUser)) {
    throw new RevenueOpportunityError("NOT_AUTHORIZED", "Follow-up task not found");
  }
  return { ref, task };
}

export async function listFollowUpTasks(
  appUser: AppUser,
  filters?: { opportunityId?: string; status?: string }
): Promise<RevenueFollowUpTask[]> {
  const db = requireDb();
  const organizationCompany = tenantCompany(appUser);
  const docs = await getOrderedQueryDocs(
    (ordered) => {
      let q: FirebaseFirestore.Query = db
        .collection(REVENUE_FOLLOW_UP_TASKS_COLLECTION)
        .where("organizationCompany", "==", organizationCompany);
      if (filters?.opportunityId) q = q.where("opportunityId", "==", filters.opportunityId);
      if (filters?.status) q = q.where("status", "==", filters.status);
      if (ordered) q = q.orderBy("dueAt", "asc");
      return q;
    },
    "dueAt"
  );
  return docs.map((d) => serializeDoc<RevenueFollowUpTask>(d.id, d.data()));
}

export async function getFollowUpTask(appUser: AppUser, id: string): Promise<RevenueFollowUpTask> {
  const { task } = await loadOwned(appUser, id);
  return task;
}

export async function createFollowUpTask(
  appUser: AppUser,
  input: RevenueFollowUpTaskCreateInput
): Promise<RevenueFollowUpTask> {
  const db = requireDb();
  const opportunityId = input.opportunityId?.trim();
  if (!opportunityId) {
    throw new RevenueOpportunityError("VALIDATION_FAILED", "opportunityId is required");
  }
  const title = input.title?.trim();
  if (!title) throw new RevenueOpportunityError("VALIDATION_FAILED", "Title is required");
  const dueAt = input.dueAt?.trim();
  if (!dueAt) throw new RevenueOpportunityError("VALIDATION_FAILED", "dueAt is required");

  let opportunityName = input.opportunityName?.trim();
  let campaignId = input.campaignId?.trim();
  try {
    const opportunity = await getOpportunity(appUser, opportunityId);
    opportunityName = opportunityName || opportunity.subject.name;
    campaignId = campaignId || opportunity.campaignId;
  } catch {
    /* allow manual create if opp lookup fails only when name provided */
    if (!opportunityName) throw new RevenueOpportunityError("NOT_FOUND", "Opportunity not found");
  }

  const payload = stripUndefined({
    organizationCompany: tenantCompany(appUser),
    ownerUserId: appUser.id,
    opportunityId,
    opportunityName,
    campaignId,
    title,
    status: "open" as const,
    dueAt,
    channel: input.channel ?? "email",
    notes: input.notes?.trim(),
    angle: input.angle?.trim(),
    draftMessage: input.draftMessage?.trim(),
    source: input.source ?? "manual",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const ref = await db.collection(REVENUE_FOLLOW_UP_TASKS_COLLECTION).add(payload);
  const snap = await ref.get();
  return serializeDoc<RevenueFollowUpTask>(ref.id, snap.data()!);
}

export async function updateFollowUpTask(
  appUser: AppUser,
  id: string,
  input: RevenueFollowUpTaskUpdateInput
): Promise<RevenueFollowUpTask> {
  const { ref, task } = await loadOwned(appUser, id);
  const patch = stripUndefined({
    ...(typeof input.title === "string" ? { title: input.title.trim() } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(typeof input.dueAt === "string" ? { dueAt: input.dueAt.trim() } : {}),
    ...(input.channel ? { channel: input.channel } : {}),
    ...(typeof input.notes === "string" ? { notes: input.notes } : {}),
    ...(typeof input.angle === "string" ? { angle: input.angle } : {}),
    ...(typeof input.draftMessage === "string" ? { draftMessage: input.draftMessage } : {}),
    ...(input.status === "done" && task.status !== "done"
      ? { completedAt: new Date().toISOString() }
      : {}),
    ...(input.status && input.status !== "done" ? { completedAt: FieldValue.delete() } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await ref.update(patch);
  const snap = await ref.get();
  return serializeDoc<RevenueFollowUpTask>(snap.id, snap.data()!);
}

export async function deleteFollowUpTask(appUser: AppUser, id: string): Promise<void> {
  const { ref } = await loadOwned(appUser, id);
  await ref.delete();
}

function dueAtFromPlan(opportunity: RevenueOpportunity): string {
  if (opportunity.workflow.followUpAt?.trim()) return opportunity.workflow.followUpAt.trim();
  const days = opportunity.followUp?.dueInDays;
  const base = new Date();
  if (typeof days === "number") {
    base.setUTCDate(base.getUTCDate() + days);
  }
  return base.toISOString().slice(0, 10);
}

/** Upsert one open agent-sourced task when the follow-up plan says due soon. */
export async function ensureFollowUpTaskFromPlan(
  appUser: AppUser,
  opportunity: RevenueOpportunity
): Promise<RevenueFollowUpTask | null> {
  const plan = opportunity.followUp;
  if (!plan) return null;
  const dueSoon =
    plan.due || (typeof plan.dueInDays === "number" && plan.dueInDays <= 7);
  if (!dueSoon) return null;

  const existing = await listFollowUpTasks(appUser, {
    opportunityId: opportunity.id,
    status: "open",
  });
  const agentOpen = existing.find((t) => t.source === "agent");
  if (agentOpen) return agentOpen;

  return createFollowUpTask(appUser, {
    opportunityId: opportunity.id,
    opportunityName: opportunity.subject.name,
    campaignId: opportunity.campaignId,
    title: plan.angle?.trim()
      ? `Follow up: ${plan.angle.trim().slice(0, 80)}`
      : `Follow up — ${opportunity.subject.name}`,
    dueAt: dueAtFromPlan(opportunity),
    channel: plan.channel ?? "email",
    angle: plan.angle,
    draftMessage: plan.draftMessage,
    notes: plan.due ? "Marked due by follow-up agent" : undefined,
    source: "agent",
  });
}
