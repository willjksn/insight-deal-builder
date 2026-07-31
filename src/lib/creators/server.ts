import { randomUUID } from "crypto";
import { FieldValue, Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import { getOrderedQueryDocs } from "@/lib/revenueOpportunities/server/queryHelpers";
import { REVENUE_BUSINESS_PROFILES_COLLECTION } from "@/lib/revenueOpportunities/collections";
import { CreatorError } from "@/lib/creators/errors";
import {
  deleteCreatorDocumentFile,
  getCreatorDocumentSignedUrl,
  uploadCreatorDocumentFile,
} from "@/lib/creators/storage";
import {
  CREATORS_COLLECTION,
  SENSITIVE_CREATOR_DOCUMENT_KINDS,
  buildDefaultOnboarding,
  isApprovedApplication,
  type Creator,
  type CreatorApplicationStatus,
  type CreatorChangeEntry,
  type CreatorCreateInput,
  type CreatorDocument,
  type CreatorDocumentKind,
  type CreatorRelationshipType,
  type CreatorUpdateInput,
} from "@/lib/creators/types";
import { AppUser } from "@/lib/types";
import { redactPaymentDetails } from "@/lib/creators/paymentDetailsServer";
import { canViewSensitiveCreatorDocs } from "@/lib/utils/permissions";

const MAX_CHANGE_HISTORY = 100;

/** Structured sub-records are diffed/edited as wholes, not scalar-logged. */
const STRUCTURED_FIELDS = new Set([
  "platforms",
  "rates",
  "availability",
  "documents",
  "readiness",
  "onboarding",
  "changeHistory",
]);

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
  if (typeof value === "object") return undefined;
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
    if (STRUCTURED_FIELDS.has(key)) continue;
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

/** Strip sensitive document URLs/paths and bank numbers for users without sensitive-doc rights. */
export function redactCreatorForViewer(creator: Creator, appUser: AppUser): Creator {
  if (canViewSensitiveCreatorDocs(appUser)) return creator;
  const docs = creator.documents;
  return {
    ...creator,
    paymentDetails: redactPaymentDetails(creator.paymentDetails),
    documents: !docs?.length
      ? docs
      : docs.map((d) => {
          if (!d.sensitive && !SENSITIVE_CREATOR_DOCUMENT_KINDS.includes(d.kind)) return d;
          return {
            ...d,
            url: "",
            storagePath: undefined,
            label: d.label ?? d.kind,
          };
        }),
  };
}

export async function listCreators(
  appUser: AppUser,
  opts?: { relationshipType?: CreatorRelationshipType; applicantsOnly?: boolean }
): Promise<Creator[]> {
  const db = requireDb();
  const organizationCompany = tenantCompany(appUser);
  const docs = await getOrderedQueryDocs(
    (ordered) => {
      let q: FirebaseFirestore.Query = db
        .collection(CREATORS_COLLECTION)
        .where("organizationCompany", "==", organizationCompany);
      if (opts?.relationshipType) {
        q = q.where("relationshipType", "==", opts.relationshipType);
      }
      if (ordered) q = q.orderBy("updatedAt", "desc");
      return q;
    },
    "updatedAt"
  );
  let creators = docs.map((d) => serializeDoc<Creator>(d.id, d.data()));
  if (opts?.applicantsOnly && !opts.relationshipType) {
    creators = creators.filter(
      (c) => c.relationshipType === "applicant" || !!c.applicationStatus
    );
  }
  return creators.map((c) => redactCreatorForViewer(c, appUser));
}

export async function getCreator(appUser: AppUser, id: string): Promise<Creator> {
  const db = requireDb();
  const snap = await db.collection(CREATORS_COLLECTION).doc(id).get();
  if (!snap.exists) throw new CreatorError("NOT_FOUND", "Creator not found");
  const data = snap.data()!;
  if (data.organizationCompany !== tenantCompany(appUser)) {
    throw new CreatorError("NOT_FOUND", "Creator not found");
  }
  return redactCreatorForViewer(serializeDoc<Creator>(snap.id, data), appUser);
}

async function loadCreatorRaw(
  appUser: AppUser,
  id: string
): Promise<{ ref: FirebaseFirestore.DocumentReference; current: Creator }> {
  const db = requireDb();
  const ref = db.collection(CREATORS_COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new CreatorError("NOT_FOUND", "Creator not found");
  const current = serializeDoc<Creator>(existing.id, existing.data()!);
  if (current.organizationCompany !== tenantCompany(appUser)) {
    throw new CreatorError("NOT_FOUND", "Creator not found");
  }
  return { ref, current };
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

  const nowIso = new Date().toISOString();
  const isApplicant = input.relationshipType === "applicant";

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
    status: input.status ?? (isApplicant ? "inactive" : "active"),
    readinessStatus: input.readinessStatus ?? "not_reviewed",
    applicationStatus: isApplicant ? "submitted" : undefined,
    applicationSubmittedAt: isApplicant ? nowIso : undefined,
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
  return redactCreatorForViewer(serializeDoc<Creator>(ref.id, snap.data()!), appUser);
}

export async function updateCreator(
  appUser: AppUser,
  id: string,
  input: CreatorUpdateInput
): Promise<Creator> {
  const { ref, current } = await loadCreatorRaw(appUser, id);

  const nowIso = new Date().toISOString();
  const newEntries = diffCreatorChanges(
    current,
    input,
    { userId: appUser.id, displayName: appUser.displayName },
    nowIso
  );
  const changeHistory = [...newEntries, ...(current.changeHistory ?? [])].slice(
    0,
    MAX_CHANGE_HISTORY
  );

  for (const key of STRUCTURED_FIELDS) {
    if (key === "changeHistory") continue;
    if ((input as Record<string, unknown>)[key] !== undefined) {
      changeHistory.unshift({
        id: randomUUID(),
        field: key,
        previousValue: undefined,
        newValue: "updated",
        changedByUserId: appUser.id,
        changedByDisplayName: appUser.displayName,
        changedAt: nowIso,
      });
    }
  }

  const update = stripUndefined({
    ...input,
    changeHistory: changeHistory.slice(0, MAX_CHANGE_HISTORY),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await ref.update(update);
  const snap = await ref.get();
  return redactCreatorForViewer(serializeDoc<Creator>(snap.id, snap.data()!), appUser);
}

/**
 * Transition an applicant through the application pipeline.
 * Approvals promote them into the roster, seed onboarding, and set dates.
 */
export async function setCreatorApplicationStatus(
  appUser: AppUser,
  id: string,
  applicationStatus: CreatorApplicationStatus,
  opts?: {
    reviewNotes?: string;
    promoteTo?: CreatorRelationshipType;
  }
): Promise<Creator> {
  const { ref, current } = await loadCreatorRaw(appUser, id);
  const nowIso = new Date().toISOString();
  const approved = isApprovedApplication(applicationStatus);

  const patch: CreatorUpdateInput = {
    applicationStatus,
    applicationReviewNotes: opts?.reviewNotes?.trim() || current.applicationReviewNotes,
  };

  if (approved) {
    patch.relationshipType =
      opts?.promoteTo && opts.promoteTo !== "applicant" ? opts.promoteTo : "network";
    patch.status = "active";
    patch.dateApproved = nowIso;
    if (!current.onboarding?.length) {
      patch.onboarding = buildDefaultOnboarding();
    }
    if (applicationStatus === "approved_with_development") {
      patch.readinessStatus = "needs_development";
    } else if (current.readinessStatus === "not_reviewed") {
      patch.readinessStatus = "nearly_ready";
    }
  }

  if (
    applicationStatus === "rejected" ||
    applicationStatus === "withdrawn" ||
    applicationStatus === "archived"
  ) {
    patch.status = "inactive";
  }

  const newEntries = diffCreatorChanges(
    current,
    patch,
    { userId: appUser.id, displayName: appUser.displayName },
    nowIso
  );
  const changeHistory = [...newEntries, ...(current.changeHistory ?? [])].slice(
    0,
    MAX_CHANGE_HISTORY
  );

  await ref.update(
    stripUndefined({
      ...patch,
      changeHistory,
      updatedAt: FieldValue.serverTimestamp(),
    })
  );
  const snap = await ref.get();
  return redactCreatorForViewer(serializeDoc<Creator>(snap.id, snap.data()!), appUser);
}

export async function addCreatorDocument(
  appUser: AppUser,
  id: string,
  input: {
    kind: CreatorDocumentKind;
    label?: string;
    url?: string;
    fileDataUrl?: string;
    fileName?: string;
  }
): Promise<Creator> {
  const { ref, current } = await loadCreatorRaw(appUser, id);
  const sensitive = SENSITIVE_CREATOR_DOCUMENT_KINDS.includes(input.kind);

  if (sensitive && !canViewSensitiveCreatorDocs(appUser)) {
    throw new CreatorError(
      "NOT_AUTHORIZED",
      "Not authorized to upload sensitive creator documents"
    );
  }

  let url = input.url?.trim() || "";
  let storagePath: string | undefined;

  if (input.fileDataUrl) {
    const uploaded = await uploadCreatorDocumentFile(
      id,
      input.kind,
      input.fileDataUrl,
      input.fileName
    );
    storagePath = uploaded.storagePath;
    url = url || `storage://${storagePath}`;
  }

  if (!url && !storagePath) {
    throw new CreatorError("VALIDATION_FAILED", "Document URL or file is required");
  }

  const nowIso = new Date().toISOString();
  const doc: CreatorDocument = stripUndefined({
    id: randomUUID(),
    kind: input.kind,
    label: input.label?.trim() || undefined,
    url,
    storagePath,
    sensitive: sensitive || undefined,
    uploadedAt: nowIso,
  }) as CreatorDocument;

  const documents = [...(current.documents ?? []), doc];
  await ref.update({
    documents,
    changeHistory: [
      {
        id: randomUUID(),
        field: "documents",
        newValue: `added ${input.kind}`,
        changedByUserId: appUser.id,
        changedByDisplayName: appUser.displayName,
        changedAt: nowIso,
      },
      ...(current.changeHistory ?? []),
    ].slice(0, MAX_CHANGE_HISTORY),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const snap = await ref.get();
  return redactCreatorForViewer(serializeDoc<Creator>(snap.id, snap.data()!), appUser);
}

export async function removeCreatorDocument(
  appUser: AppUser,
  id: string,
  documentId: string
): Promise<Creator> {
  const { ref, current } = await loadCreatorRaw(appUser, id);
  const doc = (current.documents ?? []).find((d) => d.id === documentId);
  if (!doc) throw new CreatorError("NOT_FOUND", "Document not found");

  if (doc.sensitive || SENSITIVE_CREATOR_DOCUMENT_KINDS.includes(doc.kind)) {
    if (!canViewSensitiveCreatorDocs(appUser)) {
      throw new CreatorError("NOT_AUTHORIZED", "Not authorized to remove sensitive documents");
    }
  }

  if (doc.storagePath) {
    await deleteCreatorDocumentFile(doc.storagePath);
  }

  const nowIso = new Date().toISOString();
  const documents = (current.documents ?? []).filter((d) => d.id !== documentId);
  await ref.update({
    documents,
    changeHistory: [
      {
        id: randomUUID(),
        field: "documents",
        newValue: `removed ${doc.kind}`,
        changedByUserId: appUser.id,
        changedByDisplayName: appUser.displayName,
        changedAt: nowIso,
      },
      ...(current.changeHistory ?? []),
    ].slice(0, MAX_CHANGE_HISTORY),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const snap = await ref.get();
  return redactCreatorForViewer(serializeDoc<Creator>(snap.id, snap.data()!), appUser);
}

/** Issue a short-lived signed URL for a stored creator document. */
export async function getCreatorDocumentViewUrl(
  appUser: AppUser,
  id: string,
  documentId: string
): Promise<{ url: string; expiresInMs: number }> {
  const { current } = await loadCreatorRaw(appUser, id);
  const doc = (current.documents ?? []).find((d) => d.id === documentId);
  if (!doc) throw new CreatorError("NOT_FOUND", "Document not found");

  if (doc.sensitive || SENSITIVE_CREATOR_DOCUMENT_KINDS.includes(doc.kind)) {
    if (!canViewSensitiveCreatorDocs(appUser)) {
      throw new CreatorError("NOT_AUTHORIZED", "Not authorized to view sensitive documents");
    }
  }

  if (doc.storagePath) {
    const ttl = 60 * 60 * 1000;
    const url = await getCreatorDocumentSignedUrl(doc.storagePath, ttl);
    return { url, expiresInMs: ttl };
  }
  if (doc.url && !doc.url.startsWith("storage://")) {
    return { url: doc.url, expiresInMs: 0 };
  }
  throw new CreatorError("NOT_FOUND", "Document file not available");
}

export async function deleteCreator(appUser: AppUser, id: string): Promise<void> {
  const { ref, current } = await loadCreatorRaw(appUser, id);
  for (const doc of current.documents ?? []) {
    if (doc.storagePath) await deleteCreatorDocumentFile(doc.storagePath);
  }
  await ref.delete();
}

/**
 * Idempotently ensure a flagship "Stormi" creator record exists for this tenant,
 * cross-linked to the existing Stormi business profile (never duplicating it).
 */
export async function ensureStormiCreator(
  appUser: AppUser
): Promise<{ creator: Creator; created: boolean }> {
  const db = requireDb();
  const organizationCompany = tenantCompany(appUser);

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
    return {
      creator: redactCreatorForViewer(serializeDoc<Creator>(match.id, match.data()), appUser),
      created: false,
    };
  }

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
    // Best-effort link
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
