import { randomUUID } from "crypto";
import { FieldValue, Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import { getOrderedQueryDocs } from "@/lib/revenueOpportunities/server/queryHelpers";
import { REVENUE_BUSINESS_PROFILES_COLLECTION } from "@/lib/revenueOpportunities/collections";
import { CreatorError } from "@/lib/creators/errors";
import {
  CREATORS_COLLECTION,
  type Creator,
  type CreatorChangeEntry,
  type CreatorCreateInput,
  type CreatorUpdateInput,
} from "@/lib/creators/types";
import { AppUser } from "@/lib/types";

const MAX_CHANGE_HISTORY = 100;

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

/** Stringify a field value for the human-readable change log. */
function displayValue(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (Array.isArray(value)) return value.length ? value.join(", ") : undefined;
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "object") return undefined; // sub-records diffed in later phases
  const s = String(value).trim();
  return s || undefined;
}

/** Diff scalar/array fields of a creator against an update to build audit entries. */
export function diffCreatorChanges(
  previous: Creator,
  next: CreatorUpdateInput,
  actor: { userId?: string; displayName?: string },
  changedAt: string
): CreatorChangeEntry[] {
  const entries: CreatorChangeEntry[] = [];
  for (const [key, value] of Object.entries(next)) {
    if (value === undefined) continue;
    const prevStr = displayValue((previous as unknown as Record<string, unknown>)[key]);
    const nextStr = displayValue(value);
    if (prevStr === nextStr) continue;
    entries.push({
      id: randomUUID(),
      field: key,
      previousValue: prevStr,
      newValue: nextStr,
      changedByUserId: actor.userId,
      changedByDisplayName: actor.displayName,
      changedAt,
    });
  }
  return entries;
}

export async function listCreators(appUser: AppUser): Promise<Creator[]> {
  const db = requireDb();
  const organizationCompany = tenantCompany(appUser);
  const docs = await getOrderedQueryDocs(
    (ordered) => {
      let q: FirebaseFirestore.Query = db
        .collection(CREATORS_COLLECTION)
        .where("organizationCompany", "==", organizationCompany);
      if (ordered) q = q.orderBy("updatedAt", "desc");
      return q;
    },
    "updatedAt"
  );
  return docs.map((d) => serializeDoc<Creator>(d.id, d.data()));
}

export async function getCreator(appUser: AppUser, id: string): Promise<Creator> {
  const db = requireDb();
  const snap = await db.collection(CREATORS_COLLECTION).doc(id).get();
  if (!snap.exists) throw new CreatorError("NOT_FOUND", "Creator not found");
  const data = snap.data()!;
  if (data.organizationCompany !== tenantCompany(appUser)) {
    throw new CreatorError("NOT_FOUND", "Creator not found");
  }
  return serializeDoc<Creator>(snap.id, data);
}

export async function createCreator(
  appUser: AppUser,
  input: CreatorCreateInput
): Promise<Creator> {
  const db = requireDb();
  const organizationCompany = tenantCompany(appUser);
  const professionalName = input.professionalName?.trim();
  if (!professionalName) {
    throw new CreatorError("VALIDATION_FAILED", "Creator name is required");
  }

  const payload = stripUndefined({
    organizationCompany,
    ownerUserId: appUser.id,
    professionalName,
    legalName: input.legalName?.trim() || undefined,
    email: input.email?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    location: input.location?.trim() || undefined,
    website: input.website?.trim() || undefined,
    portfolioUrl: input.portfolioUrl?.trim() || undefined,
    relationshipType: input.relationshipType ?? "network",
    status: input.status ?? "active",
    readinessStatus: input.readinessStatus ?? "not_reviewed",
    primaryNiche: input.primaryNiche?.trim() || undefined,
    secondaryNiches: input.secondaryNiches,
    tags: input.tags,
    notes: input.notes?.trim() || undefined,
    source: input.source?.trim() || undefined,
    referralSource: input.referralSource?.trim() || undefined,
    crewMemberId: input.crewMemberId || undefined,
    brandProfileId: input.brandProfileId || undefined,
    businessProfileId: input.businessProfileId || undefined,
    clientId: input.clientId || undefined,
    changeHistory: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const ref = await db.collection(CREATORS_COLLECTION).add(payload);
  const snap = await ref.get();
  return serializeDoc<Creator>(ref.id, snap.data()!);
}

export async function updateCreator(
  appUser: AppUser,
  id: string,
  input: CreatorUpdateInput
): Promise<Creator> {
  const db = requireDb();
  const ref = db.collection(CREATORS_COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new CreatorError("NOT_FOUND", "Creator not found");
  const current = serializeDoc<Creator>(existing.id, existing.data()!);
  if (current.organizationCompany !== tenantCompany(appUser)) {
    throw new CreatorError("NOT_FOUND", "Creator not found");
  }

  const nowIso = new Date().toISOString();
  const newEntries = diffCreatorChanges(
    current,
    input,
    { userId: appUser.id, displayName: appUser.displayName },
    nowIso
  );
  const changeHistory = [...newEntries, ...(current.changeHistory ?? [])].slice(0, MAX_CHANGE_HISTORY);

  const update = stripUndefined({
    ...input,
    changeHistory,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await ref.update(update);
  const snap = await ref.get();
  return serializeDoc<Creator>(snap.id, snap.data()!);
}

export async function deleteCreator(appUser: AppUser, id: string): Promise<void> {
  const db = requireDb();
  const ref = db.collection(CREATORS_COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new CreatorError("NOT_FOUND", "Creator not found");
  if (existing.data()!.organizationCompany !== tenantCompany(appUser)) {
    throw new CreatorError("NOT_FOUND", "Creator not found");
  }
  await ref.delete();
}

/**
 * Idempotently ensure a flagship "Stormi" creator record exists for this tenant,
 * cross-linked to the existing Stormi business profile (never duplicating it).
 * Safe to call repeatedly — returns the existing record if already present.
 */
export async function ensureStormiCreator(
  appUser: AppUser
): Promise<{ creator: Creator; created: boolean }> {
  const db = requireDb();
  const organizationCompany = tenantCompany(appUser);

  // Already imported? Prefer an existing flagship, else a name match.
  const existing = await db
    .collection(CREATORS_COLLECTION)
    .where("organizationCompany", "==", organizationCompany)
    .get();
  const match = existing.docs.find((d) => {
    const data = d.data();
    return (
      data.relationshipType === "flagship" ||
      String(data.professionalName ?? "").trim().toLowerCase() === "stormi"
    );
  });
  if (match) {
    return { creator: serializeDoc<Creator>(match.id, match.data()), created: false };
  }

  // Link to the existing Stormi business profile if one exists.
  let businessProfileId: string | undefined;
  try {
    const profiles = await db
      .collection(REVENUE_BUSINESS_PROFILES_COLLECTION)
      .where("organizationCompany", "==", organizationCompany)
      .where("profileType", "==", "stormi")
      .limit(1)
      .get();
    businessProfileId = profiles.docs[0]?.id;
  } catch {
    // Best-effort link; ignore lookup issues.
  }

  const creator = await createCreator(appUser, {
    professionalName: "Stormi",
    relationshipType: "flagship",
    status: "active",
    readinessStatus: "preferred",
    primaryNiche: "Flagship IMG creator",
    notes: "Flagship creator. Business profile and campaign track are managed separately.",
    source: "import",
    businessProfileId,
  });

  return { creator, created: true };
}
