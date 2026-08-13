import { Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { LIVE_OPPORTUNITIES_COLLECTION } from "@/lib/liveProduction/collections";
import {
  charlotteSeedRequirements,
  emptyLiveOpportunity,
} from "@/lib/liveProduction/defaults";
import { rematchLiveOpportunity } from "@/lib/liveProduction/rematch";
import type { LiveOpportunity, LiveOpportunityStatus } from "@/lib/liveProduction/types";
import type { AppUser, CrewMember, EquipmentCatalogItem } from "@/lib/types";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";

function requireDb(): Firestore {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");
  return db;
}

function tenantCompany(appUser: AppUser): string {
  return appUser.company?.trim() || "Insight Media Group LLC";
}

export async function listLiveOpportunities(
  appUser: AppUser,
  opts?: { status?: LiveOpportunityStatus; limit?: number }
): Promise<LiveOpportunity[]> {
  const db = requireDb();
  const company = tenantCompany(appUser);
  const snap = await db
    .collection(LIVE_OPPORTUNITIES_COLLECTION)
    .where("organizationCompany", "==", company)
    .limit(opts?.limit ?? 200)
    .get();
  let rows = snap.docs.map((d) => serializeDoc<LiveOpportunity>(d.id, d.data()));
  if (opts?.status) rows = rows.filter((r) => r.status === opts.status);
  return rows.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

export async function getLiveOpportunity(
  appUser: AppUser,
  id: string
): Promise<LiveOpportunity | null> {
  const db = requireDb();
  const snap = await db.collection(LIVE_OPPORTUNITIES_COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  const data = snap.data();
  if (!data) return null;
  const row = serializeDoc<LiveOpportunity>(snap.id, data);
  if (row.organizationCompany !== tenantCompany(appUser)) return null;
  return row;
}

export async function loadCatalogAndCrew(): Promise<{
  catalog: EquipmentCatalogItem[];
  crew: CrewMember[];
}> {
  const db = requireDb();
  const [eq, cr] = await Promise.all([
    db.collection("equipmentCatalog").limit(500).get(),
    db.collection("crewMembers").limit(500).get(),
  ]);
  return {
    catalog: eq.docs.map((d) => serializeDoc<EquipmentCatalogItem>(d.id, d.data())),
    crew: cr.docs.map((d) => serializeDoc<CrewMember>(d.id, d.data())),
  };
}

export async function createLiveOpportunity(
  appUser: AppUser,
  input: Partial<LiveOpportunity> & { title: string; organizationName: string }
): Promise<LiveOpportunity> {
  const db = requireDb();
  const { catalog, crew } = await loadCatalogAndCrew();
  const base = emptyLiveOpportunity({
    ...input,
    organizationCompany: tenantCompany(appUser),
    ownerUserId: appUser.id,
    assignedUserId: input.assignedUserId ?? appUser.id,
  });
  const matched = rematchLiveOpportunity(base, catalog, crew, {
    distanceMiles: input.distanceMiles ?? 24,
    homeState: "NC",
  });
  const ref = db.collection(LIVE_OPPORTUNITIES_COLLECTION).doc();
  const row: LiveOpportunity = {
    ...matched,
    id: ref.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await ref.set(stripUndefined(row));
  return row;
}

export async function updateLiveOpportunity(
  appUser: AppUser,
  id: string,
  patch: Partial<LiveOpportunity>,
  rematch = false
): Promise<LiveOpportunity> {
  const db = requireDb();
  const existing = await getLiveOpportunity(appUser, id);
  if (!existing) throw new Error("Opportunity not found");
  let next: LiveOpportunity = {
    ...existing,
    ...patch,
    id: existing.id,
    organizationCompany: existing.organizationCompany,
    ownerUserId: existing.ownerUserId,
    updatedAt: new Date().toISOString(),
  };
  if (rematch) {
    const { catalog, crew } = await loadCatalogAndCrew();
    next = rematchLiveOpportunity(next, catalog, crew, {
      distanceMiles: next.distanceMiles,
      homeState: "NC",
    });
  }
  await db
    .collection(LIVE_OPPORTUNITIES_COLLECTION)
    .doc(id)
    .set(stripUndefined(next), { merge: true });
  return next;
}

export async function deleteLiveOpportunity(appUser: AppUser, id: string): Promise<void> {
  const existing = await getLiveOpportunity(appUser, id);
  if (!existing) throw new Error("Opportunity not found");
  await requireDb().collection(LIVE_OPPORTUNITIES_COLLECTION).doc(id).delete();
}

/** Seed the Charlotte municipal example if the tenant has no live opportunities yet. */
export async function ensureCharlotteSeed(appUser: AppUser): Promise<LiveOpportunity | null> {
  const existing = await listLiveOpportunities(appUser, { limit: 5 });
  if (existing.length) return null;
  const { equipment, crew } = charlotteSeedRequirements();
  return createLiveOpportunity(appUser, {
    title: "Annual Audio, Lighting & LED Production Services",
    organizationName: "City of Charlotte",
    opportunityType: "Municipal Event Production",
    sourceKind: "city_procurement",
    sourceLabel: "City of Charlotte procurement",
    location: "Charlotte, NC",
    city: "Charlotte",
    state: "NC",
    bidDeadline: "2026-09-18",
    estimatedValueLow: 18000,
    estimatedValueHigh: 35000,
    distanceMiles: 24,
    tags: ["municipal", "led", "audio", "lighting", "recurring"],
    summary:
      "Annual event production services covering LED, audio, lighting, truss, staging, and technical labor for City of Charlotte events.",
    rawText: [
      "City of Charlotte — Annual Audio, Lighting & LED Production Services",
      "Bid deadline: September 18, 2026",
      "Estimated: $18,000–$35,000",
      "Requirements: 20x12 LED wall, LED processor, playback, video switcher,",
      "PA system, 12 wireless microphones, digital console, lighting package,",
      "40' truss, 24x16 stage, camera operators x3, TD, A1, LD, stagehands x6,",
      "setup and strike.",
    ].join("\n"),
    equipmentRequirements: equipment,
    crewRequirements: crew,
    adminRequirements: [
      {
        id: `r_admin_${Date.now().toString(36)}`,
        label: "Certificate of insurance / vendor registration (confirm in solicitation)",
        priority: "required",
      },
    ],
    status: "new",
  });
}

export async function dashboardStats(appUser: AppUser) {
  const rows = await listLiveOpportunities(appUser);
  const open = rows.filter((r) => !["won", "lost", "expired", "no_bid"].includes(r.status));
  const pursuing = rows.filter((r) =>
    ["pursuing", "quote_building", "proposal_submitted", "shortlisted"].includes(r.status)
  );
  const won = rows.filter((r) => r.status === "won");
  const pipeline = open.reduce(
    (n, r) => n + (r.estimatedValueHigh ?? r.estimatedValueLow ?? 0),
    0
  );
  const weighted = Math.round(
    open.reduce(
      (n, r) => n + ((r.estimatedValueHigh ?? r.estimatedValueLow ?? 0) * r.fitScore.total) / 100,
      0
    )
  );
  const avgFit = rows.length
    ? Math.round(rows.reduce((n, r) => n + r.fitScore.total, 0) / rows.length)
    : 0;

  const demand = new Map<string, number>();
  for (const r of rows) {
    for (const eq of r.equipmentRequirements) {
      const key = eq.categoryHint || eq.label.split(" ")[0] || eq.label;
      demand.set(key, (demand.get(key) || 0) + 1);
    }
  }
  const topEquipmentDemand = [...demand.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, count]) => ({ label, count }));

  return {
    openCount: open.length,
    qualifiedCount: rows.filter((r) => r.status === "qualified").length,
    pursuingCount: pursuing.length,
    pipelineValue: pipeline,
    weightedPipeline: weighted,
    wonValue: won.reduce(
      (n, r) => n + (r.estimatedValueHigh ?? r.estimatedValueLow ?? 0),
      0
    ),
    averageFitScore: avgFit,
    highFit: rows.filter((r) => r.fitScore.total >= 85 && r.status === "new").slice(0, 8),
    closingSoon: open
      .filter((r) => r.bidDeadline)
      .sort((a, b) => String(a.bidDeadline).localeCompare(String(b.bidDeadline)))
      .slice(0, 8),
    topEquipmentDemand,
  };
}

export { tenantCompany };
