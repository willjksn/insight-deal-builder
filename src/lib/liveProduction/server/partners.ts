import { Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { LIVE_PRODUCTION_PARTNERS_COLLECTION } from "@/lib/liveProduction/collections";
import type { LiveProductionPartner } from "@/lib/liveProduction/types";
import type { AppUser } from "@/lib/types";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import { tenantCompany } from "@/lib/liveProduction/server/opportunities";

function requireDb(): Firestore {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");
  return db;
}

export async function listProductionPartners(appUser: AppUser): Promise<LiveProductionPartner[]> {
  const db = requireDb();
  const company = tenantCompany(appUser);
  const snap = await db
    .collection(LIVE_PRODUCTION_PARTNERS_COLLECTION)
    .where("organizationCompany", "==", company)
    .limit(200)
    .get();
  return snap.docs
    .map((d) => serializeDoc<LiveProductionPartner>(d.id, d.data()))
    .sort((a, b) => a.companyName.localeCompare(b.companyName));
}

export async function createProductionPartner(
  appUser: AppUser,
  input: Partial<LiveProductionPartner> & { companyName: string }
): Promise<LiveProductionPartner> {
  const db = requireDb();
  const ref = db.collection(LIVE_PRODUCTION_PARTNERS_COLLECTION).doc();
  const now = new Date().toISOString();
  const row: LiveProductionPartner = {
    id: ref.id,
    organizationCompany: tenantCompany(appUser),
    companyName: input.companyName.trim(),
    contactName: input.contactName,
    contactEmail: input.contactEmail,
    contactPhone: input.contactPhone,
    location: input.location,
    services: input.services || [],
    equipmentOffered: input.equipmentOffered || [],
    serviceRadiusMiles: input.serviceRadiusMiles,
    preferred: input.preferred || false,
    rating: input.rating,
    notes: input.notes,
    insuranceOnFile: input.insuranceOnFile,
    w9OnFile: input.w9OnFile,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(stripUndefined(row));
  return row;
}
