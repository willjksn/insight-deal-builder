import { FieldValue, Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import {
  REVENUE_AGENT_RUNS_COLLECTION,
  REVENUE_CAMPAIGN_RUNS_COLLECTION,
  REVENUE_CAMPAIGNS_COLLECTION,
  REVENUE_DISCOVERY_SESSIONS_COLLECTION,
  REVENUE_EMAIL_THREADS_COLLECTION,
  REVENUE_FOLLOW_UP_TASKS_COLLECTION,
  REVENUE_OPPORTUNITIES_COLLECTION,
  REVENUE_OPPORTUNITY_PROPOSALS_COLLECTION,
  REVENUE_OUTREACH_ACTIVITIES_COLLECTION,
} from "@/lib/revenueOpportunities/collections";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import { getOrderedQueryDocs } from "@/lib/revenueOpportunities/server/queryHelpers";
import type {
  RevenueCampaign,
  RevenueCampaignCreateInput,
  RevenueCampaignUpdateInput,
} from "@/lib/revenueOpportunities/types/campaign";
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

async function deleteQueryDocs(
  db: Firestore,
  collectionName: string,
  organizationCompany: string,
  field: string,
  value: string
): Promise<number> {
  let deleted = 0;
  while (true) {
    const snap = await db
      .collection(collectionName)
      .where("organizationCompany", "==", organizationCompany)
      .where(field, "==", value)
      .limit(400)
      .get();
    if (snap.empty) break;
    const batch = db.batch();
    for (const doc of snap.docs) batch.delete(doc.ref);
    await batch.commit();
    deleted += snap.size;
  }
  return deleted;
}

const OPPORTUNITY_CHILD_COLLECTIONS = [
  REVENUE_OUTREACH_ACTIVITIES_COLLECTION,
  REVENUE_DISCOVERY_SESSIONS_COLLECTION,
  REVENUE_OPPORTUNITY_PROPOSALS_COLLECTION,
  REVENUE_AGENT_RUNS_COLLECTION,
  REVENUE_EMAIL_THREADS_COLLECTION,
  REVENUE_FOLLOW_UP_TASKS_COLLECTION,
] as const;

export async function listCampaigns(appUser: AppUser): Promise<RevenueCampaign[]> {
  const db = requireDb();
  const organizationCompany = tenantCompany(appUser);
  const docs = await getOrderedQueryDocs(
    (ordered) => {
      let q: FirebaseFirestore.Query = db
        .collection(REVENUE_CAMPAIGNS_COLLECTION)
        .where("organizationCompany", "==", organizationCompany);
      if (ordered) q = q.orderBy("updatedAt", "desc");
      return q;
    },
    "updatedAt"
  );
  return docs.map((d) => serializeDoc<RevenueCampaign>(d.id, d.data()));
}

export async function getCampaign(appUser: AppUser, id: string): Promise<RevenueCampaign> {
  const db = requireDb();
  const snap = await db.collection(REVENUE_CAMPAIGNS_COLLECTION).doc(id).get();
  if (!snap.exists) throw new RevenueOpportunityError("NOT_FOUND", "Campaign not found");
  const data = snap.data()!;
  if (data.organizationCompany !== tenantCompany(appUser)) {
    throw new RevenueOpportunityError("NOT_AUTHORIZED", "Campaign not found");
  }
  return serializeDoc<RevenueCampaign>(snap.id, data);
}

export async function createCampaign(
  appUser: AppUser,
  input: RevenueCampaignCreateInput
): Promise<RevenueCampaign> {
  const db = requireDb();
  const organizationCompany = tenantCompany(appUser);
  const payload = stripUndefined({
    ...input,
    organizationCompany,
    ownerUserId: appUser.id,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const ref = await db.collection(REVENUE_CAMPAIGNS_COLLECTION).add(payload);
  const snap = await ref.get();
  return serializeDoc<RevenueCampaign>(ref.id, snap.data()!);
}

export async function updateCampaign(
  appUser: AppUser,
  id: string,
  input: RevenueCampaignUpdateInput
): Promise<RevenueCampaign> {
  const db = requireDb();
  const ref = db.collection(REVENUE_CAMPAIGNS_COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new RevenueOpportunityError("NOT_FOUND", "Campaign not found");
  if (existing.data()!.organizationCompany !== tenantCompany(appUser)) {
    throw new RevenueOpportunityError("NOT_AUTHORIZED", "Campaign not found");
  }
  await ref.update(stripUndefined({ ...input, updatedAt: FieldValue.serverTimestamp() }));
  const snap = await ref.get();
  return serializeDoc<RevenueCampaign>(snap.id, snap.data()!);
}

export async function deleteCampaign(
  appUser: AppUser,
  id: string
): Promise<{
  deletedOpportunities: number;
  deletedCampaignRuns: number;
  deletedRelated: number;
}> {
  const db = requireDb();
  const organizationCompany = tenantCompany(appUser);
  const ref = db.collection(REVENUE_CAMPAIGNS_COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new RevenueOpportunityError("NOT_FOUND", "Campaign not found");
  if (existing.data()!.organizationCompany !== organizationCompany) {
    throw new RevenueOpportunityError("NOT_AUTHORIZED", "Campaign not found");
  }

  const oppSnap = await db
    .collection(REVENUE_OPPORTUNITIES_COLLECTION)
    .where("organizationCompany", "==", organizationCompany)
    .where("campaignId", "==", id)
    .get();
  const opportunityIds = oppSnap.docs.map((d) => d.id);

  let deletedRelated = 0;
  for (const oppId of opportunityIds) {
    for (const collectionName of OPPORTUNITY_CHILD_COLLECTIONS) {
      deletedRelated += await deleteQueryDocs(
        db,
        collectionName,
        organizationCompany,
        "opportunityId",
        oppId
      );
    }
  }

  const deletedOpportunities = await deleteQueryDocs(
    db,
    REVENUE_OPPORTUNITIES_COLLECTION,
    organizationCompany,
    "campaignId",
    id
  );
  const deletedCampaignRuns = await deleteQueryDocs(
    db,
    REVENUE_CAMPAIGN_RUNS_COLLECTION,
    organizationCompany,
    "campaignId",
    id
  );
  await ref.delete();
  return { deletedOpportunities, deletedCampaignRuns, deletedRelated };
}
