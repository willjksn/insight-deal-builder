import { FieldValue, Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { REVENUE_CAMPAIGN_RUNS_COLLECTION } from "@/lib/revenueOpportunities/collections";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";
import { getOrderedQueryDocs } from "@/lib/revenueOpportunities/server/queryHelpers";
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
    25
  );
  return docs.map((d) => serializeDoc<RevenueCampaignRun>(d.id, d.data()));
}
