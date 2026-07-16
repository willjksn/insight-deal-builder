import { FieldValue, Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { REVENUE_EMAIL_THREADS_COLLECTION } from "@/lib/revenueOpportunities/collections";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";
import { getOrderedQueryDocs } from "@/lib/revenueOpportunities/server/queryHelpers";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import type {
  EmailClassificationResult,
  RevenueEmailMessage,
  RevenueEmailThread,
  RevenueEmailThreadStatus,
} from "@/lib/revenueOpportunities/types/emailThread";
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

export async function listEmailThreads(
  appUser: AppUser,
  filters?: { opportunityId?: string; status?: RevenueEmailThreadStatus }
): Promise<RevenueEmailThread[]> {
  const db = requireDb();
  let q: FirebaseFirestore.Query = db
    .collection(REVENUE_EMAIL_THREADS_COLLECTION)
    .where("organizationCompany", "==", tenantCompany(appUser));

  if (filters?.opportunityId) q = q.where("opportunityId", "==", filters.opportunityId);
  if (filters?.status) q = q.where("status", "==", filters.status);

  const docs = await getOrderedQueryDocs(
    (ordered) => {
      let query = q;
      if (ordered) query = query.orderBy("lastMessageAt", "desc");
      return query;
    },
    "lastMessageAt",
    100
  );
  return docs.map((d) => serializeDoc<RevenueEmailThread>(d.id, d.data()));
}

export async function getEmailThread(appUser: AppUser, id: string): Promise<RevenueEmailThread> {
  const db = requireDb();
  const snap = await db.collection(REVENUE_EMAIL_THREADS_COLLECTION).doc(id).get();
  if (!snap.exists) throw new RevenueOpportunityError("NOT_FOUND", "Email thread not found");
  if (snap.data()!.organizationCompany !== tenantCompany(appUser)) {
    throw new RevenueOpportunityError("NOT_AUTHORIZED", "Email thread not found");
  }
  return serializeDoc<RevenueEmailThread>(snap.id, snap.data()!);
}

export async function upsertEmailThreadFromGmail(
  appUser: AppUser,
  input: {
    gmailThreadId: string;
    subject: string;
    participants: string[];
    messages: RevenueEmailMessage[];
    opportunityId?: string;
    outreachActivityId?: string;
  }
): Promise<RevenueEmailThread> {
  const db = requireDb();
  const existing = await db
    .collection(REVENUE_EMAIL_THREADS_COLLECTION)
    .where("organizationCompany", "==", tenantCompany(appUser))
    .where("gmailThreadId", "==", input.gmailThreadId)
    .limit(1)
    .get();

  const lastMessageAt =
    input.messages.length > 0
      ? input.messages.reduce((latest, m) => (m.receivedAt > latest ? m.receivedAt : latest), input.messages[0].receivedAt)
      : new Date().toISOString();

  const payload = stripUndefined({
    organizationCompany: tenantCompany(appUser),
    ownerUserId: appUser.id,
    gmailThreadId: input.gmailThreadId,
    subject: input.subject,
    participants: input.participants,
    messages: input.messages,
    messageCount: input.messages.length,
    lastMessageAt,
    opportunityId: input.opportunityId,
    outreachActivityId: input.outreachActivityId,
    status: "open" as RevenueEmailThreadStatus,
    autopilotMode: "draft_only" as const,
    updatedAt: FieldValue.serverTimestamp(),
  });

  if (existing.empty) {
    const ref = await db.collection(REVENUE_EMAIL_THREADS_COLLECTION).add({
      ...payload,
      createdAt: FieldValue.serverTimestamp(),
    });
    const snap = await ref.get();
    return serializeDoc<RevenueEmailThread>(ref.id, snap.data()!);
  }

  const ref = existing.docs[0].ref;
  await ref.set(payload, { merge: true });
  const snap = await ref.get();
  return serializeDoc<RevenueEmailThread>(ref.id, snap.data()!);
}

export async function applyThreadClassification(
  appUser: AppUser,
  threadId: string,
  result: EmailClassificationResult,
  agentRunId?: string
): Promise<RevenueEmailThread> {
  const db = requireDb();
  const ref = db.collection(REVENUE_EMAIL_THREADS_COLLECTION).doc(threadId);
  const existing = await ref.get();
  if (!existing.exists) throw new RevenueOpportunityError("NOT_FOUND", "Email thread not found");
  if (existing.data()!.organizationCompany !== tenantCompany(appUser)) {
    throw new RevenueOpportunityError("NOT_AUTHORIZED", "Email thread not found");
  }

  const status: RevenueEmailThreadStatus =
    result.classification === "interested" || result.classification === "scheduling"
      ? "awaiting_reply"
      : result.classification === "not_interested" || result.classification === "spam"
        ? "closed"
        : "open";

  await ref.update(
    stripUndefined({
      classification: result.classification,
      classificationSummary: result.summary,
      suggestedReply: result.suggestedReply,
      status,
      agentRunId,
      updatedAt: FieldValue.serverTimestamp(),
    })
  );
  const snap = await ref.get();
  return serializeDoc<RevenueEmailThread>(snap.id, snap.data()!);
}
