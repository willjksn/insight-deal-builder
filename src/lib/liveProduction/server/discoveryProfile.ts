import { Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { LIVE_DISCOVERY_PROFILES_COLLECTION } from "@/lib/liveProduction/collections";
import {
  defaultImgLiveProductionProfile,
  type LiveProductionTargetProfile,
} from "@/lib/liveProduction/defaultsKeywords";
import type { LiveDiscoveryProfileDoc } from "@/lib/liveProduction/discoveryTypes";
import type { AppUser } from "@/lib/types";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import { tenantCompany } from "@/lib/liveProduction/server/opportunities";

function requireDb(): Firestore {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");
  return db;
}

function profileDocId(company: string): string {
  return company.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "default";
}

export async function getDiscoveryProfile(appUser: AppUser): Promise<LiveDiscoveryProfileDoc> {
  const db = requireDb();
  const company = tenantCompany(appUser);
  const id = profileDocId(company);
  const snap = await db.collection(LIVE_DISCOVERY_PROFILES_COLLECTION).doc(id).get();
  if (!snap.exists) {
    const defaults = defaultImgLiveProductionProfile();
    return {
      id,
      organizationCompany: company,
      ...defaults,
      updatedAt: new Date(0).toISOString(),
    };
  }
  return serializeDoc<LiveDiscoveryProfileDoc>(snap.id, snap.data()!);
}

export async function saveDiscoveryProfile(
  appUser: AppUser,
  patch: Partial<LiveProductionTargetProfile>
): Promise<LiveDiscoveryProfileDoc> {
  const db = requireDb();
  const company = tenantCompany(appUser);
  const id = profileDocId(company);
  const current = await getDiscoveryProfile(appUser);
  const next: LiveDiscoveryProfileDoc = {
    ...current,
    ...patch,
    id,
    organizationCompany: company,
    homeLocation: (patch.homeLocation ?? current.homeLocation).trim() || current.homeLocation,
    radiusMiles: Number(patch.radiusMiles ?? current.radiusMiles) || 250,
    minimumProject: Number(patch.minimumProject ?? current.minimumProject) || 0,
    preferredProject: Number(patch.preferredProject ?? current.preferredProject) || 0,
    services: Array.isArray(patch.services) ? patch.services.map(String) : current.services,
    exclude: Array.isArray(patch.exclude) ? patch.exclude.map(String) : current.exclude,
    keywords: Array.isArray(patch.keywords) ? patch.keywords.map(String) : current.keywords,
    updatedAt: new Date().toISOString(),
    updatedBy: appUser.id,
  };
  await db.collection(LIVE_DISCOVERY_PROFILES_COLLECTION).doc(id).set(stripUndefined(next));
  return next;
}
