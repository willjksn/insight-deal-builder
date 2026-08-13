import { Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { LIVE_DISCOVERY_RUNS_COLLECTION } from "@/lib/liveProduction/collections";
import type {
  LiveDiscoveryCandidate,
  LiveDiscoveryRun,
} from "@/lib/liveProduction/discoveryTypes";
import { runLiveDiscoveryPass } from "@/lib/liveProduction/runDiscovery";
import {
  createLiveOpportunity,
  listLiveOpportunities,
  tenantCompany,
} from "@/lib/liveProduction/server/opportunities";
import { getDiscoveryProfile } from "@/lib/liveProduction/server/discoveryProfile";
import type { AppUser } from "@/lib/types";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import type { LiveOpportunity } from "@/lib/liveProduction/types";

function requireDb(): Firestore {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");
  return db;
}

export async function listDiscoveryRuns(
  appUser: AppUser,
  limit = 10
): Promise<LiveDiscoveryRun[]> {
  const db = requireDb();
  const company = tenantCompany(appUser);
  const snap = await db
    .collection(LIVE_DISCOVERY_RUNS_COLLECTION)
    .where("organizationCompany", "==", company)
    .limit(40)
    .get();
  return snap.docs
    .map((d) => serializeDoc<LiveDiscoveryRun>(d.id, d.data()))
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .slice(0, limit);
}

export async function getDiscoveryRun(
  appUser: AppUser,
  id: string
): Promise<LiveDiscoveryRun | null> {
  const db = requireDb();
  const snap = await db.collection(LIVE_DISCOVERY_RUNS_COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  const row = serializeDoc<LiveDiscoveryRun>(snap.id, snap.data()!);
  if (row.organizationCompany !== tenantCompany(appUser)) return null;
  return row;
}

export async function startDiscoveryRun(appUser: AppUser): Promise<LiveDiscoveryRun> {
  const db = requireDb();
  const company = tenantCompany(appUser);
  const profile = await getDiscoveryProfile(appUser);
  const ref = db.collection(LIVE_DISCOVERY_RUNS_COLLECTION).doc();
  const now = new Date().toISOString();
  const running: LiveDiscoveryRun = {
    id: ref.id,
    organizationCompany: company,
    ownerUserId: appUser.id,
    status: "running",
    queries: [],
    candidates: [],
    importedOpportunityIds: [],
    usedLiveSearch: false,
    usedLiveAi: false,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(stripUndefined(running));

  try {
    const pass = await runLiveDiscoveryPass(profile);
    const completed: LiveDiscoveryRun = {
      ...running,
      status: "completed",
      queries: pass.queries,
      candidates: pass.candidates,
      usedLiveSearch: pass.usedLiveSearch,
      usedLiveAi: pass.usedLiveAi,
      updatedAt: new Date().toISOString(),
    };
    await ref.set(stripUndefined(completed));
    return completed;
  } catch (err) {
    const failed: LiveDiscoveryRun = {
      ...running,
      status: "failed",
      error: err instanceof Error ? err.message : "Discovery failed",
      updatedAt: new Date().toISOString(),
    };
    await ref.set(stripUndefined(failed));
    return failed;
  }
}

function candidateRawText(c: LiveDiscoveryCandidate): string {
  return [
    c.title,
    c.organizationName,
    c.opportunityType,
    c.location,
    c.summary,
    c.whyFit,
    `Services: ${c.servicesMentioned.join(", ")}`,
    c.includesLiveStreaming ? "Includes live streaming / webcast." : "",
    c.sourceUrl ? `Source: ${c.sourceUrl}` : "",
    c.bidDeadline ? `Bid deadline: ${c.bidDeadline}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function importDiscoveryCandidates(
  appUser: AppUser,
  runId: string,
  candidateIds: string[]
): Promise<{ opportunities: LiveOpportunity[]; run: LiveDiscoveryRun }> {
  const run = await getDiscoveryRun(appUser, runId);
  if (!run) throw new Error("Discovery run not found");
  if (run.status !== "completed") throw new Error("Discovery run is not completed");

  const existing = await listLiveOpportunities(appUser, { limit: 200 });
  const byUrl = new Set(
    existing.map((o) => (o.sourceUrl || "").trim().toLowerCase()).filter(Boolean)
  );
  const selected = run.candidates.filter((c) => candidateIds.includes(c.id));
  if (!selected.length) throw new Error("No candidates selected");

  const created: LiveOpportunity[] = [];
  const importedIds = [...run.importedOpportunityIds];

  for (const c of selected) {
    const urlKey = (c.sourceUrl || "").trim().toLowerCase();
    if (urlKey && byUrl.has(urlKey)) continue;

    const tags = [
      "discovery",
      ...(c.includesLiveStreaming ? ["live-streaming"] : []),
      ...c.servicesMentioned.slice(0, 4).map((s) => s.toLowerCase().replace(/\s+/g, "-")),
    ];

    const opportunity = await createLiveOpportunity(appUser, {
      title: c.title,
      organizationName: c.organizationName,
      opportunityType: c.opportunityType,
      sourceKind: c.sourceKind,
      sourceLabel: "Live production discovery",
      sourceUrl: c.sourceUrl,
      location: c.location,
      bidDeadline: c.bidDeadline,
      estimatedValueLow: c.estimatedValueLow,
      estimatedValueHigh: c.estimatedValueHigh,
      summary: [c.summary, c.whyFit].filter(Boolean).join("\n\n"),
      rawText: candidateRawText(c),
      tags: [...new Set(tags)],
      isPartnerSubcontract: c.sourceKind === "partner_subcontract",
      status: "new",
    });
    created.push(opportunity);
    importedIds.push(opportunity.id);
    if (urlKey) byUrl.add(urlKey);
  }

  // Optional: re-create with analyze by updating raw and letting caller analyze — for V1, trigger analyze inline
  const { analyzeLiveOpportunityText } = await import("@/lib/liveProduction/analyzeOpportunity");
  const { updateLiveOpportunity } = await import("@/lib/liveProduction/server/opportunities");
  const finalized: LiveOpportunity[] = [];
  for (const opp of created) {
    if (!opp.rawText?.trim()) {
      finalized.push(opp);
      continue;
    }
    try {
      const extract = await analyzeLiveOpportunityText(opp.rawText, {
        sourceUrl: opp.sourceUrl,
        titleHint: opp.title,
      });
      const updated = await updateLiveOpportunity(
        appUser,
        opp.id,
        {
          opportunityType: extract.opportunityType || opp.opportunityType,
          location: extract.location || opp.location,
          city: extract.city || opp.city,
          state: extract.state || opp.state,
          venue: extract.venue || opp.venue,
          bidDeadline: extract.bidDeadline || opp.bidDeadline,
          estimatedValueLow: extract.estimatedValueLow ?? opp.estimatedValueLow,
          estimatedValueHigh: extract.estimatedValueHigh ?? opp.estimatedValueHigh,
          summary: extract.summary || opp.summary,
          equipmentRequirements:
            extract.equipmentRequirements.length > 0
              ? extract.equipmentRequirements
              : opp.equipmentRequirements,
          crewRequirements:
            extract.crewRequirements.length > 0
              ? extract.crewRequirements
              : opp.crewRequirements,
          adminRequirements:
            extract.adminRequirements.length > 0
              ? extract.adminRequirements
              : opp.adminRequirements,
          status: "reviewing",
        },
        true
      );
      finalized.push(updated);
    } catch {
      finalized.push(opp);
    }
  }

  const nextRun: LiveDiscoveryRun = {
    ...run,
    importedOpportunityIds: [...new Set(importedIds)],
    updatedAt: new Date().toISOString(),
  };
  await requireDb()
    .collection(LIVE_DISCOVERY_RUNS_COLLECTION)
    .doc(runId)
    .set(stripUndefined(nextRun), { merge: true });

  return { opportunities: finalized, run: nextRun };
}
