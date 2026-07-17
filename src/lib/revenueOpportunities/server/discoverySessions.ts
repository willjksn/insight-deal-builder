import { FieldValue, Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { REVENUE_DISCOVERY_SESSIONS_COLLECTION } from "@/lib/revenueOpportunities/collections";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";
import { questionNotesFromPrep } from "@/lib/revenueOpportunities/discovery/callNotes";
import { getOrderedQueryDocs } from "@/lib/revenueOpportunities/server/queryHelpers";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import type {
  DiscoveryDebrief,
  DiscoveryPrepBrief,
  DiscoveryQuestionNote,
  RevenueDiscoverySession,
  RevenueDiscoverySessionStatus,
} from "@/lib/revenueOpportunities/types/discovery";
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

export async function listDiscoverySessions(
  appUser: AppUser,
  filters?: { opportunityId?: string; status?: RevenueDiscoverySessionStatus }
): Promise<RevenueDiscoverySession[]> {
  const db = requireDb();
  let q: FirebaseFirestore.Query = db
    .collection(REVENUE_DISCOVERY_SESSIONS_COLLECTION)
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
  return docs.map((d) => serializeDoc<RevenueDiscoverySession>(d.id, d.data()));
}

export async function getDiscoverySession(appUser: AppUser, id: string): Promise<RevenueDiscoverySession> {
  const db = requireDb();
  const snap = await db.collection(REVENUE_DISCOVERY_SESSIONS_COLLECTION).doc(id).get();
  if (!snap.exists) throw new RevenueOpportunityError("NOT_FOUND", "Discovery session not found");
  if (snap.data()!.organizationCompany !== tenantCompany(appUser)) {
    throw new RevenueOpportunityError("NOT_AUTHORIZED", "Discovery session not found");
  }
  return serializeDoc<RevenueDiscoverySession>(snap.id, snap.data()!);
}

export async function createDiscoverySession(
  appUser: AppUser,
  input: {
    opportunityId: string;
    opportunitySubjectName?: string;
    scheduledAt?: string;
    prepBrief?: DiscoveryPrepBrief;
    prepAgentRunId?: string;
  }
): Promise<RevenueDiscoverySession> {
  const db = requireDb();
  const ref = await db.collection(REVENUE_DISCOVERY_SESSIONS_COLLECTION).add(
    stripUndefined({
      organizationCompany: tenantCompany(appUser),
      ownerUserId: appUser.id,
      opportunityId: input.opportunityId,
      opportunitySubjectName: input.opportunitySubjectName,
      status: "scheduled" as RevenueDiscoverySessionStatus,
      scheduledAt: input.scheduledAt,
      prepBrief: input.prepBrief,
      callQuestionNotes: input.prepBrief?.questionsToAsk.length
        ? questionNotesFromPrep(input.prepBrief.questionsToAsk)
        : undefined,
      prepAgentRunId: input.prepAgentRunId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  );
  const snap = await ref.get();
  return serializeDoc<RevenueDiscoverySession>(ref.id, snap.data()!);
}

export async function updateDiscoverySession(
  appUser: AppUser,
  id: string,
  patch: Partial<
    Pick<
      RevenueDiscoverySession,
      | "status"
      | "scheduledAt"
      | "completedAt"
      | "prepBrief"
      | "callQuestionNotes"
      | "additionalCallNotes"
      | "callNotes"
      | "debrief"
      | "debriefAgentRunId"
    >
  >
): Promise<RevenueDiscoverySession> {
  const db = requireDb();
  const ref = db.collection(REVENUE_DISCOVERY_SESSIONS_COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new RevenueOpportunityError("NOT_FOUND", "Discovery session not found");
  if (existing.data()!.organizationCompany !== tenantCompany(appUser)) {
    throw new RevenueOpportunityError("NOT_AUTHORIZED", "Discovery session not found");
  }
  await ref.update(stripUndefined({ ...patch, updatedAt: FieldValue.serverTimestamp() }));
  const snap = await ref.get();
  return serializeDoc<RevenueDiscoverySession>(snap.id, snap.data()!);
}

export async function applyDiscoveryDebrief(
  appUser: AppUser,
  id: string,
  input: {
    callQuestionNotes: DiscoveryQuestionNote[];
    additionalCallNotes?: string;
    compiledCallNotes: string;
    debrief: DiscoveryDebrief;
    agentRunId?: string;
  }
): Promise<RevenueDiscoverySession> {
  return updateDiscoverySession(appUser, id, {
    callQuestionNotes: input.callQuestionNotes,
    additionalCallNotes: input.additionalCallNotes?.trim() || undefined,
    callNotes: input.compiledCallNotes,
    debrief: input.debrief,
    debriefAgentRunId: input.agentRunId,
    status: "completed",
    completedAt: new Date().toISOString(),
  });
}
