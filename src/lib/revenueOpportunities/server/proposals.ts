import { FieldValue, Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { REVENUE_OPPORTUNITY_PROPOSALS_COLLECTION } from "@/lib/revenueOpportunities/collections";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";
import { getOrderedQueryDocs } from "@/lib/revenueOpportunities/server/queryHelpers";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import type { ProposalDraftBundle } from "@/lib/revenueOpportunities/types/proposal";
import type { RevenueOpportunityProposal, RevenueProposalStatus } from "@/lib/revenueOpportunities/types/proposal";
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

export async function listProposals(
  appUser: AppUser,
  filters?: { opportunityId?: string; status?: RevenueProposalStatus }
): Promise<RevenueOpportunityProposal[]> {
  const db = requireDb();
  let q: FirebaseFirestore.Query = db
    .collection(REVENUE_OPPORTUNITY_PROPOSALS_COLLECTION)
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
  return docs.map((d) => serializeDoc<RevenueOpportunityProposal>(d.id, d.data()));
}

export async function getProposal(appUser: AppUser, id: string): Promise<RevenueOpportunityProposal> {
  const db = requireDb();
  const snap = await db.collection(REVENUE_OPPORTUNITY_PROPOSALS_COLLECTION).doc(id).get();
  if (!snap.exists) throw new RevenueOpportunityError("NOT_FOUND", "Proposal not found");
  if (snap.data()!.organizationCompany !== tenantCompany(appUser)) {
    throw new RevenueOpportunityError("NOT_AUTHORIZED", "Proposal not found");
  }
  return serializeDoc<RevenueOpportunityProposal>(snap.id, snap.data()!);
}

export async function createProposalFromDraft(
  appUser: AppUser,
  input: {
    opportunityId: string;
    opportunitySubjectName?: string;
    discoverySessionId?: string;
    draft: ProposalDraftBundle;
    agentRunId?: string;
  }
): Promise<RevenueOpportunityProposal> {
  const db = requireDb();
  const d = input.draft;
  const ref = await db.collection(REVENUE_OPPORTUNITY_PROPOSALS_COLLECTION).add(
    stripUndefined({
      organizationCompany: tenantCompany(appUser),
      ownerUserId: appUser.id,
      opportunityId: input.opportunityId,
      opportunitySubjectName: input.opportunitySubjectName,
      discoverySessionId: input.discoverySessionId,
      status: "draft" as RevenueProposalStatus,
      title: d.title,
      executiveSummary: d.executiveSummary,
      scopeOutline: d.scopeOutline,
      deliverables: d.deliverables,
      timelineNotes: d.timelineNotes,
      investmentMin: d.investmentMin,
      investmentMax: d.investmentMax,
      paymentStructureSuggestion: d.paymentStructureSuggestion,
      agreementPrefill: d.agreementPrefill,
      agentRunId: input.agentRunId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  );
  const snap = await ref.get();
  return serializeDoc<RevenueOpportunityProposal>(ref.id, snap.data()!);
}

export async function updateProposal(
  appUser: AppUser,
  id: string,
  patch: Partial<
    Pick<
      RevenueOpportunityProposal,
      | "status"
      | "title"
      | "executiveSummary"
      | "scopeOutline"
      | "deliverables"
      | "timelineNotes"
      | "investmentMin"
      | "investmentMax"
      | "paymentStructureSuggestion"
      | "agreementPrefill"
      | "agreementId"
    >
  >
): Promise<RevenueOpportunityProposal> {
  const db = requireDb();
  const ref = db.collection(REVENUE_OPPORTUNITY_PROPOSALS_COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new RevenueOpportunityError("NOT_FOUND", "Proposal not found");
  if (existing.data()!.organizationCompany !== tenantCompany(appUser)) {
    throw new RevenueOpportunityError("NOT_AUTHORIZED", "Proposal not found");
  }
  await ref.update(stripUndefined({ ...patch, updatedAt: FieldValue.serverTimestamp() }));
  const snap = await ref.get();
  return serializeDoc<RevenueOpportunityProposal>(snap.id, snap.data()!);
}
