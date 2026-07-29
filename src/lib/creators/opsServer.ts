import { randomUUID } from "crypto";
import { FieldValue, Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import { getOrderedQueryDocs } from "@/lib/revenueOpportunities/server/queryHelpers";
import { CreatorError } from "@/lib/creators/errors";
import { getCreator, listCreators } from "@/lib/creators/server";
import { isStormiCreator } from "@/lib/creators/types";
import { getCampaign as getRevenueCampaign } from "@/lib/revenueOpportunities/server/campaigns";
import type { RevenueCampaign } from "@/lib/revenueOpportunities/types/campaign";
import {
  buildCreatorNetworkSummary,
  filterCreators,
  rankCreatorsForBrief,
  computeCampaignMargin,
  type MatchBrief,
} from "@/lib/creators/network";
import {
  CREATOR_CAMPAIGNS_COLLECTION,
  CREATOR_PRODUCTION_DAYS_COLLECTION,
  CREATOR_SAVED_SEARCHES_COLLECTION,
  CREATOR_SHORTLISTS_COLLECTION,
  type CreatorBrief,
  type CreatorCampaign,
  type CreatorCampaignAssignment,
  type CreatorCampaignCreateInput,
  type CreatorCampaignUpdateInput,
  type CreatorDeliverable,
  type CreatorMatchResult,
  type CreatorNetworkFilters,
  type CreatorNetworkSummary,
  type CreatorProductionDay,
  type CreatorProductionDayCreateInput,
  type CreatorSavedSearch,
  type CreatorShortlist,
  type CreatorShortlistCreateInput,
  type CreatorShortlistEntry,
  type CreatorShortlistEntryStatus,
  type CreatorShortlistUpdateInput,
} from "@/lib/creators/opsTypes";
import type { CreatorDevelopmentItem, CreatorDevelopmentPlan } from "@/lib/creators/opsTypes";
import { AppUser } from "@/lib/types";

function requireDb(): Firestore {
  const db = getAdminDb();
  if (!db) throw new CreatorError("NOT_CONFIGURED", "Firebase Admin is not configured");
  return db;
}

function tenantCompany(appUser: AppUser): string {
  const company = appUser.company?.trim();
  if (!company) throw new CreatorError("NOT_AUTHORIZED", "Organization company is required");
  return company;
}

async function assertOwnedDoc(
  collection: string,
  id: string,
  appUser: AppUser
): Promise<{ ref: FirebaseFirestore.DocumentReference; data: FirebaseFirestore.DocumentData }> {
  const db = requireDb();
  const ref = db.collection(collection).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new CreatorError("NOT_FOUND", "Record not found");
  const data = snap.data()!;
  if (data.organizationCompany !== tenantCompany(appUser)) {
    throw new CreatorError("NOT_FOUND", "Record not found");
  }
  return { ref, data };
}

// ── Network summary + filters ──────────────────────────────────────────────

export async function getCreatorNetworkSummary(
  appUser: AppUser
): Promise<CreatorNetworkSummary> {
  const creators = await listCreators(appUser);
  // listCreators redacts docs; fine for summary counts
  return buildCreatorNetworkSummary(creators);
}

export async function searchCreators(
  appUser: AppUser,
  filters: CreatorNetworkFilters
) {
  const creators = await listCreators(appUser);
  return filterCreators(creators, filters);
}

export async function runCreatorMatch(
  appUser: AppUser,
  brief: MatchBrief,
  limit = 10
): Promise<CreatorMatchResult[]> {
  const creators = await listCreators(appUser);
  return rankCreatorsForBrief(creators, brief, limit);
}

// ── Saved searches ─────────────────────────────────────────────────────────

export async function listSavedSearches(appUser: AppUser): Promise<CreatorSavedSearch[]> {
  const db = requireDb();
  const organizationCompany = tenantCompany(appUser);
  const docs = await getOrderedQueryDocs(
    (ordered) => {
      let q: FirebaseFirestore.Query = db
        .collection(CREATOR_SAVED_SEARCHES_COLLECTION)
        .where("organizationCompany", "==", organizationCompany)
        .where("ownerUserId", "==", appUser.id);
      if (ordered) q = q.orderBy("updatedAt", "desc");
      return q;
    },
    "updatedAt"
  );
  return docs.map((d) => serializeDoc<CreatorSavedSearch>(d.id, d.data()));
}

export async function createSavedSearch(
  appUser: AppUser,
  name: string,
  filters: CreatorNetworkFilters
): Promise<CreatorSavedSearch> {
  const db = requireDb();
  const payload = stripUndefined({
    organizationCompany: tenantCompany(appUser),
    ownerUserId: appUser.id,
    name: name.trim(),
    filters,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const ref = await db.collection(CREATOR_SAVED_SEARCHES_COLLECTION).add(payload);
  const snap = await ref.get();
  return serializeDoc<CreatorSavedSearch>(ref.id, snap.data()!);
}

export async function deleteSavedSearch(appUser: AppUser, id: string): Promise<void> {
  const { ref } = await assertOwnedDoc(CREATOR_SAVED_SEARCHES_COLLECTION, id, appUser);
  await ref.delete();
}

// ── Shortlists ─────────────────────────────────────────────────────────────

export async function listShortlists(appUser: AppUser): Promise<CreatorShortlist[]> {
  const db = requireDb();
  const organizationCompany = tenantCompany(appUser);
  const docs = await getOrderedQueryDocs(
    (ordered) => {
      let q: FirebaseFirestore.Query = db
        .collection(CREATOR_SHORTLISTS_COLLECTION)
        .where("organizationCompany", "==", organizationCompany);
      if (ordered) q = q.orderBy("updatedAt", "desc");
      return q;
    },
    "updatedAt"
  );
  return docs.map((d) => serializeDoc<CreatorShortlist>(d.id, d.data()));
}

export async function getShortlist(appUser: AppUser, id: string): Promise<CreatorShortlist> {
  const { data } = await assertOwnedDoc(CREATOR_SHORTLISTS_COLLECTION, id, appUser);
  return serializeDoc<CreatorShortlist>(id, data);
}

export async function createShortlist(
  appUser: AppUser,
  input: CreatorShortlistCreateInput
): Promise<CreatorShortlist> {
  const db = requireDb();
  const name = input.name?.trim();
  if (!name) throw new CreatorError("VALIDATION_FAILED", "Shortlist name is required");
  const payload = stripUndefined({
    organizationCompany: tenantCompany(appUser),
    ownerUserId: appUser.id,
    name,
    opportunityId: input.opportunityId,
    campaignId: input.campaignId,
    brief: input.brief,
    requiredNiche: input.requiredNiche,
    requiredPlatforms: input.requiredPlatforms,
    locationPreference: input.locationPreference,
    entries: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const ref = await db.collection(CREATOR_SHORTLISTS_COLLECTION).add(payload);
  const snap = await ref.get();
  return serializeDoc<CreatorShortlist>(ref.id, snap.data()!);
}

export async function updateShortlist(
  appUser: AppUser,
  id: string,
  input: CreatorShortlistUpdateInput
): Promise<CreatorShortlist> {
  const { ref } = await assertOwnedDoc(CREATOR_SHORTLISTS_COLLECTION, id, appUser);
  await ref.update(
    stripUndefined({ ...input, updatedAt: FieldValue.serverTimestamp() })
  );
  const snap = await ref.get();
  return serializeDoc<CreatorShortlist>(id, snap.data()!);
}

export async function deleteShortlist(appUser: AppUser, id: string): Promise<void> {
  const { ref } = await assertOwnedDoc(CREATOR_SHORTLISTS_COLLECTION, id, appUser);
  await ref.delete();
}

export async function addShortlistEntry(
  appUser: AppUser,
  shortlistId: string,
  entry: {
    creatorId: string;
    creatorName: string;
    status?: CreatorShortlistEntryStatus;
    matchScore?: number;
    matchReasons?: string[];
    notes?: string;
  }
): Promise<CreatorShortlist> {
  const shortlist = await getShortlist(appUser, shortlistId);
  if (shortlist.entries.some((e) => e.creatorId === entry.creatorId)) {
    throw new CreatorError("VALIDATION_FAILED", "Creator already on shortlist");
  }
  const next: CreatorShortlistEntry = {
    id: randomUUID(),
    creatorId: entry.creatorId,
    creatorName: entry.creatorName,
    status: entry.status ?? "shortlisted",
    matchScore: entry.matchScore,
    matchReasons: entry.matchReasons,
    notes: entry.notes,
    addedAt: new Date().toISOString(),
  };
  return updateShortlist(appUser, shortlistId, {
    entries: [...shortlist.entries, next],
  });
}

export async function updateShortlistEntry(
  appUser: AppUser,
  shortlistId: string,
  entryId: string,
  patch: Partial<CreatorShortlistEntry>
): Promise<CreatorShortlist> {
  const shortlist = await getShortlist(appUser, shortlistId);
  const entries = shortlist.entries.map((e) =>
    e.id === entryId ? { ...e, ...patch, id: e.id, creatorId: e.creatorId } : e
  );
  return updateShortlist(appUser, shortlistId, { entries });
}

export async function populateShortlistFromMatch(
  appUser: AppUser,
  shortlistId: string,
  limit = 8
): Promise<CreatorShortlist> {
  const shortlist = await getShortlist(appUser, shortlistId);
  const matches = await runCreatorMatch(
    appUser,
    {
      requiredNiche: shortlist.requiredNiche,
      requiredPlatforms: shortlist.requiredPlatforms,
      locationPreference: shortlist.locationPreference,
      audienceNotes: shortlist.brief,
    },
    limit
  );
  const existing = new Set(shortlist.entries.map((e) => e.creatorId));
  const additions: CreatorShortlistEntry[] = matches
    .filter((m) => !existing.has(m.creatorId))
    .map((m) => ({
      id: randomUUID(),
      creatorId: m.creatorId,
      creatorName: m.creatorName,
      status: "suggested" as const,
      matchScore: m.score,
      matchReasons: m.reasons,
      addedAt: new Date().toISOString(),
    }));
  return updateShortlist(appUser, shortlistId, {
    entries: [...shortlist.entries, ...additions],
  });
}

// ── Creator campaigns ──────────────────────────────────────────────────────

export async function listCreatorCampaigns(appUser: AppUser): Promise<CreatorCampaign[]> {
  const db = requireDb();
  const organizationCompany = tenantCompany(appUser);
  const docs = await getOrderedQueryDocs(
    (ordered) => {
      let q: FirebaseFirestore.Query = db
        .collection(CREATOR_CAMPAIGNS_COLLECTION)
        .where("organizationCompany", "==", organizationCompany);
      if (ordered) q = q.orderBy("updatedAt", "desc");
      return q;
    },
    "updatedAt"
  );
  return docs.map((d) => serializeDoc<CreatorCampaign>(d.id, d.data()));
}

export async function getCreatorCampaign(
  appUser: AppUser,
  id: string
): Promise<CreatorCampaign> {
  const { data } = await assertOwnedDoc(CREATOR_CAMPAIGNS_COLLECTION, id, appUser);
  return serializeDoc<CreatorCampaign>(id, data);
}

export async function createCreatorCampaign(
  appUser: AppUser,
  input: CreatorCampaignCreateInput
): Promise<CreatorCampaign> {
  const db = requireDb();
  const name = input.name?.trim();
  if (!name) throw new CreatorError("VALIDATION_FAILED", "Campaign name is required");
  const payload = stripUndefined({
    organizationCompany: tenantCompany(appUser),
    ownerUserId: appUser.id,
    name,
    brandName: input.brandName?.trim(),
    objective: input.objective?.trim(),
    status: input.status ?? "draft",
    revenueCampaignId: input.revenueCampaignId,
    opportunityId: input.opportunityId,
    shortlistId: input.shortlistId,
    notes: input.notes,
    assignments: [],
    briefs: [],
    deliverables: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const ref = await db.collection(CREATOR_CAMPAIGNS_COLLECTION).add(payload);
  const snap = await ref.get();
  return serializeDoc<CreatorCampaign>(ref.id, snap.data()!);
}

export async function updateCreatorCampaign(
  appUser: AppUser,
  id: string,
  input: CreatorCampaignUpdateInput
): Promise<CreatorCampaign> {
  const { ref, data } = await assertOwnedDoc(CREATOR_CAMPAIGNS_COLLECTION, id, appUser);
  const economics = input.economics
    ? {
        ...input.economics,
        estimatedMargin: computeCampaignMargin(input.economics),
      }
    : undefined;
  await ref.update(
    stripUndefined({
      ...input,
      economics: economics ?? input.economics,
      updatedAt: FieldValue.serverTimestamp(),
    })
  );
  // Keep TypeScript happy if data unused for audit later
  void data;
  const snap = await ref.get();
  return serializeDoc<CreatorCampaign>(id, snap.data()!);
}

export async function deleteCreatorCampaign(appUser: AppUser, id: string): Promise<void> {
  const { ref } = await assertOwnedDoc(CREATOR_CAMPAIGNS_COLLECTION, id, appUser);
  await ref.delete();
}

export async function upsertCampaignBrief(
  appUser: AppUser,
  campaignId: string,
  brief: Omit<CreatorBrief, "id" | "updatedAt"> & { id?: string }
): Promise<CreatorCampaign> {
  const campaign = await getCreatorCampaign(appUser, campaignId);
  const now = new Date().toISOString();
  let briefs = [...(campaign.briefs ?? [])];
  if (brief.id) {
    briefs = briefs.map((b) =>
      b.id === brief.id ? { ...b, ...brief, id: b.id, updatedAt: now } : b
    );
  } else {
    briefs.push({ ...brief, id: randomUUID(), updatedAt: now });
  }
  return updateCreatorCampaign(appUser, campaignId, { briefs });
}

export async function upsertCampaignDeliverable(
  appUser: AppUser,
  campaignId: string,
  deliverable: Omit<CreatorDeliverable, "id"> & { id?: string }
): Promise<CreatorCampaign> {
  const campaign = await getCreatorCampaign(appUser, campaignId);
  let deliverables = [...(campaign.deliverables ?? [])];
  if (deliverable.id) {
    deliverables = deliverables.map((d) =>
      d.id === deliverable.id ? { ...d, ...deliverable, id: d.id } : d
    );
  } else {
    deliverables.push({ ...deliverable, id: randomUUID() });
  }
  return updateCreatorCampaign(appUser, campaignId, { deliverables });
}

/** Link a won campaign to a production project id (additive — does not create the project). */
export async function linkCampaignToProject(
  appUser: AppUser,
  campaignId: string,
  projectId: string
): Promise<CreatorCampaign> {
  return updateCreatorCampaign(appUser, campaignId, {
    projectId,
    status: "in_production",
  });
}

export type CampaignAssignmentInput = {
  creatorId: string;
  role?: string;
  compensation?: number;
  compensationNotes?: string;
  status?: string;
};

/** Assign a roster creator so they can see this campaign in the portal. */
export async function addCampaignAssignment(
  appUser: AppUser,
  campaignId: string,
  input: CampaignAssignmentInput
): Promise<CreatorCampaign> {
  const creatorId = input.creatorId?.trim();
  if (!creatorId) throw new CreatorError("VALIDATION_FAILED", "Creator is required");

  const campaign = await getCreatorCampaign(appUser, campaignId);
  if ((campaign.assignments ?? []).some((a) => a.creatorId === creatorId)) {
    throw new CreatorError("VALIDATION_FAILED", "Creator is already assigned to this campaign");
  }

  const creator = await getCreator(appUser, creatorId);
  const assignment: CreatorCampaignAssignment = stripUndefined({
    id: randomUUID(),
    creatorId: creator.id,
    creatorName: creator.professionalName,
    role: input.role?.trim() || undefined,
    compensation: typeof input.compensation === "number" ? input.compensation : undefined,
    compensationNotes: input.compensationNotes?.trim() || undefined,
    status: input.status?.trim() || "assigned",
  }) as CreatorCampaignAssignment;

  return updateCreatorCampaign(appUser, campaignId, {
    assignments: [...(campaign.assignments ?? []), assignment],
  });
}

export async function updateCampaignAssignment(
  appUser: AppUser,
  campaignId: string,
  assignmentId: string,
  patch: Omit<CampaignAssignmentInput, "creatorId"> & { creatorId?: never }
): Promise<CreatorCampaign> {
  const campaign = await getCreatorCampaign(appUser, campaignId);
  const existing = (campaign.assignments ?? []).find((a) => a.id === assignmentId);
  if (!existing) throw new CreatorError("NOT_FOUND", "Assignment not found");

  const next: CreatorCampaignAssignment = stripUndefined({
    ...existing,
    role: patch.role !== undefined ? patch.role.trim() || undefined : existing.role,
    compensation:
      patch.compensation !== undefined ? patch.compensation : existing.compensation,
    compensationNotes:
      patch.compensationNotes !== undefined
        ? patch.compensationNotes.trim() || undefined
        : existing.compensationNotes,
    status: patch.status !== undefined ? patch.status.trim() || undefined : existing.status,
  }) as CreatorCampaignAssignment;

  return updateCreatorCampaign(appUser, campaignId, {
    assignments: (campaign.assignments ?? []).map((a) =>
      a.id === assignmentId ? next : a
    ),
  });
}

export async function removeCampaignAssignment(
  appUser: AppUser,
  campaignId: string,
  assignmentId: string
): Promise<CreatorCampaign> {
  const campaign = await getCreatorCampaign(appUser, campaignId);
  const before = campaign.assignments ?? [];
  if (!before.some((a) => a.id === assignmentId)) {
    throw new CreatorError("NOT_FOUND", "Assignment not found");
  }
  return updateCreatorCampaign(appUser, campaignId, {
    assignments: before.filter((a) => a.id !== assignmentId),
  });
}

/** Find an existing creator-ops campaign linked to a revenue campaign (if any). */
export async function findCreatorCampaignByRevenueId(
  appUser: AppUser,
  revenueCampaignId: string
): Promise<CreatorCampaign | null> {
  const db = requireDb();
  const organizationCompany = tenantCompany(appUser);
  const snap = await db
    .collection(CREATOR_CAMPAIGNS_COLLECTION)
    .where("organizationCompany", "==", organizationCompany)
    .where("revenueCampaignId", "==", revenueCampaignId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return serializeDoc<CreatorCampaign>(snap.docs[0].id, snap.docs[0].data());
}

const HANDOFF_SHORTLIST_STATUSES = new Set([
  "suggested",
  "shortlisted",
  "availability_requested",
  "hold",
  "confirmed",
]);

async function resolveHandoffAssignments(
  appUser: AppUser,
  revenue: RevenueCampaign
): Promise<CreatorCampaignAssignment[]> {
  const creatorIds = new Set<string>();
  const stormi = revenue.stormi;
  const scope = stormi?.creatorScope;

  for (const id of stormi?.linkedCreatorIds ?? []) {
    if (typeof id === "string" && id.trim()) creatorIds.add(id.trim());
  }

  if (
    scope === "stormi_flagship" ||
    (revenue.campaignType === "stormi_brand" && !scope && creatorIds.size === 0)
  ) {
    const roster = await listCreators(appUser);
    const stormiCreator = roster.find((c) => isStormiCreator(c));
    if (stormiCreator) creatorIds.add(stormiCreator.id);
  }

  if (stormi?.shortlistId) {
    try {
      const shortlist = await getShortlist(appUser, stormi.shortlistId);
      for (const entry of shortlist.entries ?? []) {
        if (HANDOFF_SHORTLIST_STATUSES.has(entry.status) && entry.creatorId) {
          creatorIds.add(entry.creatorId);
        }
      }
    } catch {
      // Shortlist may have been deleted — still create the campaign.
    }
  }

  const assignments: CreatorCampaignAssignment[] = [];
  for (const creatorId of creatorIds) {
    try {
      const creator = await getCreator(appUser, creatorId);
      assignments.push(
        stripUndefined({
          id: randomUUID(),
          creatorId: creator.id,
          creatorName: creator.professionalName,
          status: "assigned",
        }) as CreatorCampaignAssignment
      );
    } catch {
      // Skip missing / unauthorized creator ids.
    }
  }
  return assignments;
}

/**
 * Create (or return existing) creator-ops campaign from a revenue BD campaign.
 * Prefills assignments from linkedCreatorIds, shortlist entries, and Stormi when scoped.
 */
export async function handoffRevenueCampaignToCreatorOps(
  appUser: AppUser,
  revenueCampaignId: string
): Promise<{ creatorCampaign: CreatorCampaign; created: boolean }> {
  const revenue = await getRevenueCampaign(appUser, revenueCampaignId);
  const existing = await findCreatorCampaignByRevenueId(appUser, revenue.id);
  if (existing) {
    return { creatorCampaign: existing, created: false };
  }

  const assignments = await resolveHandoffAssignments(appUser, revenue);
  const brandName =
    revenue.stormi?.brandCategory?.trim() ||
    revenue.img?.industry?.trim() ||
    undefined;
  const objective =
    revenue.objective?.trim() ||
    revenue.stormi?.desiredPartnershipType?.trim() ||
    revenue.img?.serviceToPromote?.trim() ||
    undefined;

  const created = await createCreatorCampaign(appUser, {
    name: revenue.name,
    brandName,
    objective,
    status: "draft",
    revenueCampaignId: revenue.id,
    shortlistId: revenue.stormi?.shortlistId,
    notes: `Handed off from revenue campaign ${revenue.id} (${revenue.campaignType}).`,
  });

  if (assignments.length === 0) {
    return { creatorCampaign: created, created: true };
  }

  const withAssignments = await updateCreatorCampaign(appUser, created.id, {
    assignments,
  });
  return { creatorCampaign: withAssignments, created: true };
}

// ── Production days ────────────────────────────────────────────────────────

export async function listProductionDays(appUser: AppUser): Promise<CreatorProductionDay[]> {
  const db = requireDb();
  const organizationCompany = tenantCompany(appUser);
  const docs = await getOrderedQueryDocs(
    (ordered) => {
      let q: FirebaseFirestore.Query = db
        .collection(CREATOR_PRODUCTION_DAYS_COLLECTION)
        .where("organizationCompany", "==", organizationCompany);
      if (ordered) q = q.orderBy("date", "desc");
      return q;
    },
    "date"
  );
  return docs.map((d) => serializeDoc<CreatorProductionDay>(d.id, d.data()));
}

export async function createProductionDay(
  appUser: AppUser,
  input: CreatorProductionDayCreateInput
): Promise<CreatorProductionDay> {
  const db = requireDb();
  if (!input.name?.trim() || !input.date?.trim()) {
    throw new CreatorError("VALIDATION_FAILED", "Name and date are required");
  }
  const payload = stripUndefined({
    organizationCompany: tenantCompany(appUser),
    ownerUserId: appUser.id,
    name: input.name.trim(),
    date: input.date.trim(),
    location: input.location?.trim(),
    theme: input.theme?.trim(),
    capacity: input.capacity,
    creatorIds: input.creatorIds ?? [],
    notes: input.notes,
    status: "planned",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const ref = await db.collection(CREATOR_PRODUCTION_DAYS_COLLECTION).add(payload);
  const snap = await ref.get();
  return serializeDoc<CreatorProductionDay>(ref.id, snap.data()!);
}

export async function updateProductionDay(
  appUser: AppUser,
  id: string,
  input: Partial<CreatorProductionDay>
): Promise<CreatorProductionDay> {
  const { ref } = await assertOwnedDoc(CREATOR_PRODUCTION_DAYS_COLLECTION, id, appUser);
  const { id: _id, organizationCompany: _o, ownerUserId: _u, createdAt: _c, ...rest } = input;
  void _id;
  void _o;
  void _u;
  void _c;
  await ref.update(stripUndefined({ ...rest, updatedAt: FieldValue.serverTimestamp() }));
  const snap = await ref.get();
  return serializeDoc<CreatorProductionDay>(id, snap.data()!);
}

export async function deleteProductionDay(appUser: AppUser, id: string): Promise<void> {
  const { ref } = await assertOwnedDoc(CREATOR_PRODUCTION_DAYS_COLLECTION, id, appUser);
  await ref.delete();
}

// ── Development plans (stored on creator via update) ───────────────────────

export async function saveCreatorDevelopmentPlan(
  appUser: AppUser,
  creatorId: string,
  plan: CreatorDevelopmentPlan
): Promise<void> {
  // Stored as a JSON blob under notes-adjacent field via tags isn't ideal —
  // keep plan in a dedicated sub-field by updating creator with a custom field
  // through the update path. We use the creator `notes` companion: store under
  // Firestore field `developmentPlan` via raw update.
  const db = requireDb();
  const ref = db.collection("creators").doc(creatorId);
  const snap = await ref.get();
  if (!snap.exists) throw new CreatorError("NOT_FOUND", "Creator not found");
  if (snap.data()!.organizationCompany !== tenantCompany(appUser)) {
    throw new CreatorError("NOT_FOUND", "Creator not found");
  }
  await ref.update({
    developmentPlan: plan,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export function buildStarterDevelopmentPlan(creatorId: string, areas: string[]): CreatorDevelopmentPlan {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    creatorId,
    title: "Development plan",
    status: "active",
    createdAt: now,
    updatedAt: now,
    items: areas.map((area) => ({
      id: randomUUID(),
      area,
      goal: `Improve ${area}`,
      status: "planned" as const,
    })),
  };
}

export type { CreatorDevelopmentItem, CreatorDevelopmentPlan };
