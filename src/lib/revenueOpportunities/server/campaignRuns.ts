import { FieldValue, Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { REVENUE_CAMPAIGN_RUNS_COLLECTION } from "@/lib/revenueOpportunities/collections";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";
import {
  getOrderedQueryDocs,
  isFirestoreIndexPending,
} from "@/lib/revenueOpportunities/server/queryHelpers";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import type { RevenueCampaignRun, RevenueCampaignRunStatus } from "@/lib/revenueOpportunities/types/campaignRun";
import type { RevenueCampaign } from "@/lib/revenueOpportunities/types/campaign";
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

export async function createCampaignRun(
  appUser: AppUser,
  campaign: RevenueCampaign,
  meta: { searchQuery?: string; usedLiveSearch: boolean; usedLiveAi: boolean }
): Promise<RevenueCampaignRun> {
  const db = requireDb();
  const ref = await db.collection(REVENUE_CAMPAIGN_RUNS_COLLECTION).add(
    stripUndefined({
      organizationCompany: tenantCompany(appUser),
      ownerUserId: appUser.id,
      campaignId: campaign.id,
      campaignName: campaign.name,
      campaignType: campaign.campaignType,
      status: "running",
      opportunitiesRequested: campaign.opportunityCountRequested,
      opportunitiesCreated: 0,
      opportunityIds: [],
      searchQuery: meta.searchQuery,
      usedLiveSearch: meta.usedLiveSearch,
      usedLiveAi: meta.usedLiveAi,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  );
  const snap = await ref.get();
  return serializeDoc<RevenueCampaignRun>(ref.id, snap.data()!);
}

export async function finishCampaignRun(
  id: string,
  patch: {
    status: RevenueCampaignRunStatus;
    agentRunId?: string;
    agentName?: string;
    opportunitiesCreated: number;
    opportunityIds: string[];
    searchQuery?: string;
    usedLiveSearch?: boolean;
    usedLiveAi?: boolean;
    errorMessage?: string;
  }
): Promise<RevenueCampaignRun> {
  const db = requireDb();
  const ref = db.collection(REVENUE_CAMPAIGN_RUNS_COLLECTION).doc(id);
  await ref.update(
    stripUndefined({
      ...patch,
      updatedAt: FieldValue.serverTimestamp(),
      completedAt: FieldValue.serverTimestamp(),
    })
  );
  const snap = await ref.get();
  return serializeDoc<RevenueCampaignRun>(snap.id, snap.data()!);
}

/** Keep the UI tidy — older run history is discarded automatically. */
export const CAMPAIGN_RUNS_KEEP_LATEST = 10;

export async function listCampaignRuns(
  appUser: AppUser,
  campaignId?: string
): Promise<RevenueCampaignRun[]> {
  const db = requireDb();
  const organizationCompany = tenantCompany(appUser);
  const docs = await getOrderedQueryDocs(
    (ordered) => {
      let q: FirebaseFirestore.Query = db
        .collection(REVENUE_CAMPAIGN_RUNS_COLLECTION)
        .where("organizationCompany", "==", organizationCompany);
      if (campaignId) q = q.where("campaignId", "==", campaignId);
      if (ordered) q = q.orderBy("createdAt", "desc");
      return q;
    },
    "createdAt",
    40
  );

  if (campaignId && docs.length > CAMPAIGN_RUNS_KEEP_LATEST) {
    const overflow = docs.slice(CAMPAIGN_RUNS_KEEP_LATEST);
    await Promise.all(overflow.map((d) => d.ref.delete().catch(() => undefined)));
    return docs
      .slice(0, CAMPAIGN_RUNS_KEEP_LATEST)
      .map((d) => serializeDoc<RevenueCampaignRun>(d.id, d.data()));
  }

  return docs.map((d) => serializeDoc<RevenueCampaignRun>(d.id, d.data()));
}

export async function deleteCampaignRun(appUser: AppUser, runId: string): Promise<void> {
  const db = requireDb();
  const organizationCompany = tenantCompany(appUser);
  const ref = db.collection(REVENUE_CAMPAIGN_RUNS_COLLECTION).doc(runId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new RevenueOpportunityError("NOT_FOUND", "Research run not found");
  }
  if (snap.get("organizationCompany") !== organizationCompany) {
    throw new RevenueOpportunityError("NOT_AUTHORIZED", "Not allowed to delete this research run");
  }
  await ref.delete();
}

/** After a new run finishes, drop older history for that campaign. */
export async function pruneCampaignRuns(appUser: AppUser, campaignId: string): Promise<void> {
  await listCampaignRuns(appUser, campaignId);
}

/** Count research runs for a campaign since `since` (inclusive). */
export async function countCampaignRunsSince(
  appUser: AppUser,
  campaignId: string,
  since: Date
): Promise<number> {
  const db = requireDb();
  const organizationCompany = tenantCompany(appUser);
  const sinceMs = since.getTime();

  // Prefer a ranged query when the composite index exists; otherwise fall back
  // to equality filters + in-memory date check (avoids FAILED_PRECONDITION 500s).
  try {
    const snap = await db
      .collection(REVENUE_CAMPAIGN_RUNS_COLLECTION)
      .where("organizationCompany", "==", organizationCompany)
      .where("campaignId", "==", campaignId)
      .where("createdAt", ">=", since)
      .get();
    return snap.size;
  } catch (err) {
    if (!isFirestoreIndexPending(err)) throw err;
    const docs = await getOrderedQueryDocs(
      (ordered) => {
        let q: FirebaseFirestore.Query = db
          .collection(REVENUE_CAMPAIGN_RUNS_COLLECTION)
          .where("organizationCompany", "==", organizationCompany)
          .where("campaignId", "==", campaignId);
        if (ordered) q = q.orderBy("createdAt", "desc");
        return q;
      },
      "createdAt"
    );
    return docs.filter((d) => {
      const createdAt = d.get("createdAt") as { toMillis?: () => number } | Date | string | undefined;
      if (!createdAt) return false;
      if (typeof createdAt === "string") return new Date(createdAt).getTime() >= sinceMs;
      if (createdAt instanceof Date) return createdAt.getTime() >= sinceMs;
      if (typeof createdAt.toMillis === "function") return createdAt.toMillis() >= sinceMs;
      return false;
    }).length;
  }
}
