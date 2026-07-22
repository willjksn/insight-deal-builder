import { randomUUID } from "crypto";
import { FieldValue, Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { REVENUE_BUSINESS_PROFILES_COLLECTION } from "@/lib/revenueOpportunities/collections";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import { getOrderedQueryDocs } from "@/lib/revenueOpportunities/server/queryHelpers";
import type {
  BusinessProfile,
  BusinessProfileChangeEntry,
  BusinessProfileCreateInput,
  BusinessProfileFields,
  BusinessProfileUpdateInput,
} from "@/lib/revenueOpportunities/types/businessProfile";
import {
  generateProfileDraft,
  type GenerateProfileDraftInput,
} from "@/lib/revenueOpportunities/profileBuilder/generateProfileDraft";
import {
  buildPendingChanges,
  resolvePendingChanges,
} from "@/lib/revenueOpportunities/profileBuilder/pendingChanges";
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

const MAX_CHANGE_HISTORY = 100;

/** Stringify a field value for the human-readable change log. */
function displayValue(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (Array.isArray(value)) return value.length ? value.join(", ") : undefined;
  if (typeof value === "boolean") return value ? "yes" : "no";
  const s = String(value).trim();
  return s || undefined;
}

/** Compute change-log entries by diffing a previous profile against updates. */
export function diffProfileChanges(
  previous: Pick<BusinessProfile, "name" | "profileType" | "status" | "fields">,
  next: {
    name?: string;
    profileType?: BusinessProfile["profileType"];
    status?: BusinessProfile["status"];
    fields?: Partial<BusinessProfileFields>;
  },
  actor: { userId?: string; displayName?: string },
  changedAt: string
): BusinessProfileChangeEntry[] {
  const entries: BusinessProfileChangeEntry[] = [];
  const record = (field: string, prev: unknown, val: unknown) => {
    const prevStr = displayValue(prev);
    const nextStr = displayValue(val);
    if (prevStr === nextStr) return;
    entries.push({
      id: randomUUID(),
      field,
      previousValue: prevStr,
      newValue: nextStr,
      source: "manual",
      changedByUserId: actor.userId,
      changedByDisplayName: actor.displayName,
      changedAt,
    });
  };

  if (next.name !== undefined) record("name", previous.name, next.name);
  if (next.profileType !== undefined) record("profileType", previous.profileType, next.profileType);
  if (next.status !== undefined) record("status", previous.status, next.status);

  if (next.fields) {
    for (const [key, value] of Object.entries(next.fields)) {
      record(key, (previous.fields ?? {})[key as keyof BusinessProfileFields], value);
    }
  }

  return entries;
}

export async function listBusinessProfiles(appUser: AppUser): Promise<BusinessProfile[]> {
  const db = requireDb();
  const organizationCompany = tenantCompany(appUser);
  const docs = await getOrderedQueryDocs(
    (ordered) => {
      let q: FirebaseFirestore.Query = db
        .collection(REVENUE_BUSINESS_PROFILES_COLLECTION)
        .where("organizationCompany", "==", organizationCompany);
      if (ordered) q = q.orderBy("updatedAt", "desc");
      return q;
    },
    "updatedAt"
  );
  return docs.map((d) => serializeDoc<BusinessProfile>(d.id, d.data()));
}

export async function getBusinessProfile(appUser: AppUser, id: string): Promise<BusinessProfile> {
  const db = requireDb();
  const snap = await db.collection(REVENUE_BUSINESS_PROFILES_COLLECTION).doc(id).get();
  if (!snap.exists) throw new RevenueOpportunityError("NOT_FOUND", "Profile not found");
  const data = snap.data()!;
  if (data.organizationCompany !== tenantCompany(appUser)) {
    throw new RevenueOpportunityError("NOT_AUTHORIZED", "Profile not found");
  }
  return serializeDoc<BusinessProfile>(snap.id, data);
}

export async function createBusinessProfile(
  appUser: AppUser,
  input: BusinessProfileCreateInput
): Promise<BusinessProfile> {
  const db = requireDb();
  const organizationCompany = tenantCompany(appUser);
  const nowIso = new Date().toISOString();

  const payload = stripUndefined({
    organizationCompany,
    ownerUserId: appUser.id,
    name: input.name,
    profileType: input.profileType,
    status: input.status ?? "active",
    fields: stripUndefined({ ...(input.fields ?? {}) }),
    review: {
      source: "manual",
      lastUpdatedAt: nowIso,
      lastUpdatedByUserId: appUser.id,
      lastReviewedAt: nowIso,
      lastReviewedByUserId: appUser.id,
    },
    pendingChanges: [],
    changeHistory: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const ref = await db.collection(REVENUE_BUSINESS_PROFILES_COLLECTION).add(payload);
  const snap = await ref.get();
  return serializeDoc<BusinessProfile>(ref.id, snap.data()!);
}

export async function updateBusinessProfile(
  appUser: AppUser,
  id: string,
  input: BusinessProfileUpdateInput
): Promise<BusinessProfile> {
  const db = requireDb();
  const ref = db.collection(REVENUE_BUSINESS_PROFILES_COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new RevenueOpportunityError("NOT_FOUND", "Profile not found");
  const current = serializeDoc<BusinessProfile>(existing.id, existing.data()!);
  if (current.organizationCompany !== tenantCompany(appUser)) {
    throw new RevenueOpportunityError("NOT_AUTHORIZED", "Profile not found");
  }

  const nowIso = new Date().toISOString();
  const newEntries = diffProfileChanges(
    current,
    input,
    { userId: appUser.id, displayName: appUser.displayName },
    nowIso
  );

  // Merge field updates onto existing fields (partial patch), then trim undefined.
  const mergedFields = input.fields
    ? stripUndefined({ ...current.fields, ...input.fields })
    : undefined;

  const changeHistory = [...newEntries, ...(current.changeHistory ?? [])].slice(
    0,
    MAX_CHANGE_HISTORY
  );

  const update = stripUndefined({
    name: input.name,
    profileType: input.profileType,
    status: input.status,
    fields: mergedFields,
    changeHistory,
    review: {
      ...current.review,
      source: current.review?.source ?? "manual",
      lastUpdatedAt: nowIso,
      lastUpdatedByUserId: appUser.id,
      lastReviewedAt: nowIso,
      lastReviewedByUserId: appUser.id,
    },
    updatedAt: FieldValue.serverTimestamp(),
  });

  await ref.update(update);
  const snap = await ref.get();
  return serializeDoc<BusinessProfile>(snap.id, snap.data()!);
}

/**
 * Run the AI builder over pasted material / a URL and stage the results as
 * review-only pending changes. Approved fields are never overwritten here.
 */
export async function draftBusinessProfile(
  appUser: AppUser,
  id: string,
  input: Pick<GenerateProfileDraftInput, "sourceText" | "sourceUrl">
): Promise<{ profile: BusinessProfile; usedLiveAi: boolean; notes: string[]; suggestionCount: number }> {
  const db = requireDb();
  const ref = db.collection(REVENUE_BUSINESS_PROFILES_COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new RevenueOpportunityError("NOT_FOUND", "Profile not found");
  const current = serializeDoc<BusinessProfile>(existing.id, existing.data()!);
  if (current.organizationCompany !== tenantCompany(appUser)) {
    throw new RevenueOpportunityError("NOT_AUTHORIZED", "Profile not found");
  }

  const { draft, usedLiveAi } = await generateProfileDraft({
    profileType: current.profileType,
    sourceText: input.sourceText,
    sourceUrl: input.sourceUrl,
  });

  const nowIso = new Date().toISOString();
  const pendingChanges = buildPendingChanges(current.fields ?? {}, draft.fields, {
    source: usedLiveAi ? "ai" : "manual",
    confidence: draft.confidence,
    now: nowIso,
  });

  await ref.update(
    stripUndefined({ pendingChanges, updatedAt: FieldValue.serverTimestamp() })
  );
  const snap = await ref.get();
  const profile = serializeDoc<BusinessProfile>(snap.id, snap.data()!);
  return { profile, usedLiveAi, notes: draft.notes, suggestionCount: pendingChanges.length };
}

/** Approve or reject staged pending changes (all, or a specific subset). */
export async function resolveBusinessProfilePending(
  appUser: AppUser,
  id: string,
  action: "approve" | "reject",
  changeIds?: string[]
): Promise<BusinessProfile> {
  const db = requireDb();
  const ref = db.collection(REVENUE_BUSINESS_PROFILES_COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new RevenueOpportunityError("NOT_FOUND", "Profile not found");
  const current = serializeDoc<BusinessProfile>(existing.id, existing.data()!);
  if (current.organizationCompany !== tenantCompany(appUser)) {
    throw new RevenueOpportunityError("NOT_AUTHORIZED", "Profile not found");
  }

  const nowIso = new Date().toISOString();
  const resolved = resolvePendingChanges(
    current,
    action,
    changeIds,
    { userId: appUser.id, displayName: appUser.displayName },
    nowIso
  );

  const update: Record<string, unknown> = {
    pendingChanges: resolved.pendingChanges,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (action === "approve" && resolved.appliedCount > 0) {
    update.fields = resolved.fields;
    update.changeHistory = resolved.changeHistory;
    update.review = {
      ...current.review,
      source: "ai",
      lastUpdatedAt: nowIso,
      lastUpdatedByUserId: appUser.id,
      lastReviewedAt: nowIso,
      lastReviewedByUserId: appUser.id,
    };
  }

  await ref.update(stripUndefined(update));
  const snap = await ref.get();
  return serializeDoc<BusinessProfile>(snap.id, snap.data()!);
}

export async function deleteBusinessProfile(appUser: AppUser, id: string): Promise<void> {
  const db = requireDb();
  const ref = db.collection(REVENUE_BUSINESS_PROFILES_COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new RevenueOpportunityError("NOT_FOUND", "Profile not found");
  if (existing.data()!.organizationCompany !== tenantCompany(appUser)) {
    throw new RevenueOpportunityError("NOT_AUTHORIZED", "Profile not found");
  }
  await ref.delete();
}
