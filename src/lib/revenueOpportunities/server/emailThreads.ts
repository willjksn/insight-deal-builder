import { FieldValue, Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { REVENUE_EMAIL_THREADS_COLLECTION } from "@/lib/revenueOpportunities/collections";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";
import { getOrderedQueryDocs } from "@/lib/revenueOpportunities/server/queryHelpers";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import { getOpportunity, setOpportunityPipelineStage } from "@/lib/revenueOpportunities/server/opportunities";
import type { RevenuePipelineStage } from "@/lib/revenueOpportunities/types";
import type {
  EmailClassificationResult,
  RevenueEmailMessage,
  RevenueEmailThread,
  RevenueEmailThreadStatus,
} from "@/lib/revenueOpportunities/types/emailThread";
import { AppUser } from "@/lib/types";

const STAGE_RANK: Record<RevenuePipelineStage, number> = {
  new: 0,
  researched: 1,
  review_required: 2,
  approved: 3,
  ready_for_outreach: 4,
  contacted: 5,
  follow_up_due: 6,
  replied: 7,
  discovery_call: 8,
  proposal: 9,
  negotiating: 10,
  won: 11,
  converted_to_project: 12,
  lost: 13,
  revisit_later: 14,
};

function stageFromClassification(
  classification: EmailClassificationResult["classification"]
): RevenuePipelineStage | null {
  switch (classification) {
    case "interested":
    case "question":
    case "referral":
      return "replied";
    case "scheduling":
      return "discovery_call";
    case "out_of_office":
      return "follow_up_due";
    case "not_interested":
    case "spam":
      return "lost";
    default:
      return null;
  }
}

function shouldApplyInboxStage(current: RevenuePipelineStage, next: RevenuePipelineStage): boolean {
  if (current === next) return false;
  if (current === "converted_to_project") return false;
  if (current === "won" && next !== "converted_to_project") return false;
  if (next === "lost" || next === "revisit_later") return true;
  if (current === "lost" || current === "revisit_later") {
    return next === "replied" || next === "discovery_call";
  }
  return STAGE_RANK[next] >= STAGE_RANK[current];
}

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

  const existingOpportunityId = existing.empty
    ? undefined
    : (existing.docs[0].data().opportunityId as string | undefined);
  // Keep an existing link; only apply caller/match id when the thread is still unlinked.
  const opportunityId = existingOpportunityId ?? input.opportunityId;

  const payload = stripUndefined({
    organizationCompany: tenantCompany(appUser),
    ownerUserId: appUser.id,
    gmailThreadId: input.gmailThreadId,
    subject: input.subject,
    participants: input.participants,
    messages: input.messages,
    messageCount: input.messages.length,
    lastMessageAt,
    opportunityId,
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

export async function updateEmailThreadOpportunity(
  appUser: AppUser,
  threadId: string,
  opportunityId: string | null
): Promise<RevenueEmailThread> {
  const db = requireDb();
  const ref = db.collection(REVENUE_EMAIL_THREADS_COLLECTION).doc(threadId);
  const existing = await ref.get();
  if (!existing.exists) throw new RevenueOpportunityError("NOT_FOUND", "Email thread not found");
  if (existing.data()!.organizationCompany !== tenantCompany(appUser)) {
    throw new RevenueOpportunityError("NOT_AUTHORIZED", "Email thread not found");
  }

  if (opportunityId) {
    await getOpportunity(appUser, opportunityId);
    await ref.update({
      opportunityId,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    await ref.update({
      opportunityId: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  const snap = await ref.get();
  return serializeDoc<RevenueEmailThread>(snap.id, snap.data()!);
}

function extractEmails(participants: string[]): string[] {
  return participants
    .map((p) => {
      const m = p.match(/[\w.+-]+@[\w.-]+\.\w+/i);
      return m?.[0]?.toLowerCase();
    })
    .filter((e): e is string => Boolean(e));
}

/** Match thread participants to opportunity contact/public email (exact email only). */
export function matchOpportunityIdByParticipants(
  opportunities: { id: string; contact?: { email?: string }; subject: { publicEmail?: string } }[],
  participants: string[]
): string | undefined {
  const emails = new Set(extractEmails(participants));
  if (emails.size === 0) return undefined;

  for (const opp of opportunities) {
    const candidates = [opp.contact?.email, opp.subject.publicEmail]
      .map((e) => e?.trim().toLowerCase())
      .filter((e): e is string => Boolean(e));
    if (candidates.some((e) => emails.has(e))) return opp.id;
  }
  return undefined;
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

  const opportunityId = existing.data()!.opportunityId as string | undefined;
  const nextStage = stageFromClassification(result.classification);
  if (opportunityId && nextStage) {
    try {
      const opportunity = await getOpportunity(appUser, opportunityId);
      if (shouldApplyInboxStage(opportunity.workflow.pipelineStage, nextStage)) {
        await setOpportunityPipelineStage(appUser, opportunityId, nextStage, {
          source: "inbox_classification",
        });
      }
    } catch {
      // Thread classification still succeeds if opportunity is missing or unauthorized.
    }
  }

  const snap = await ref.get();
  return serializeDoc<RevenueEmailThread>(snap.id, snap.data()!);
}
