import { randomUUID } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import { CreatorError } from "@/lib/creators/errors";
import {
  deleteCreatorDocumentFile,
  getCreatorDocumentSignedUrl,
  uploadCreatorDocumentFile,
} from "@/lib/creators/storage";
import { getLinkedCreatorForUser } from "@/lib/creators/portalServer";
import {
  CREATORS_COLLECTION,
  CREATOR_ID_ONBOARDING_TASK_ID,
  buildDefaultOnboarding,
  sanitizeCreatorOnboarding,
  type Creator,
  type CreatorDocument,
  type CreatorIdentityVerification,
  type CreatorOnboardingTask,
} from "@/lib/creators/types";
import { canViewSensitiveCreatorDocs } from "@/lib/utils/permissions";
import { AppUser } from "@/lib/types";

function requireDb() {
  const db = getAdminDb();
  if (!db) throw new CreatorError("NOT_CONFIGURED", "Firebase Admin is not configured");
  return db;
}

function markIdTask(
  tasks: CreatorOnboardingTask[] | undefined,
  done: boolean,
  at: string,
  notes?: string
): CreatorOnboardingTask[] {
  const base = sanitizeCreatorOnboarding(tasks);
  const list = base.length ? base : buildDefaultOnboarding();
  const hasTask = list.some((t) => t.id === CREATOR_ID_ONBOARDING_TASK_ID);
  const withTask = hasTask
    ? list
    : [
        {
          id: CREATOR_ID_ONBOARDING_TASK_ID,
          label: "ID verification complete",
          done: false,
        },
        ...list,
      ];
  return withTask.map((t) =>
    t.id === CREATOR_ID_ONBOARDING_TASK_ID
      ? {
          ...t,
          done,
          doneAt: done ? at : undefined,
          notes: notes ?? t.notes,
        }
      : t
  );
}

export type CreatorIdentityPortalView = {
  verification: CreatorIdentityVerification;
  canUpload: boolean;
  hasFront: boolean;
  hasBack: boolean;
};

function defaultVerification(
  existing?: CreatorIdentityVerification
): CreatorIdentityVerification {
  return existing ?? { status: "none" };
}

export async function getIdentityVerificationForPortal(
  appUser: AppUser
): Promise<CreatorIdentityPortalView> {
  const creator = await getLinkedCreatorForUser(appUser);
  const verification = defaultVerification(creator.identityVerification);
  const canUpload =
    verification.status === "none" || verification.status === "rejected";
  return {
    verification,
    canUpload,
    hasFront: Boolean(verification.frontDocumentId),
    hasBack: Boolean(verification.backDocumentId),
  };
}

async function uploadSide(
  creatorId: string,
  side: "front" | "back",
  fileDataUrl: string,
  fileName?: string
): Promise<CreatorDocument> {
  const uploaded = await uploadCreatorDocumentFile(
    creatorId,
    "id_verification",
    fileDataUrl,
    fileName
  );
  const nowIso = new Date().toISOString();
  return stripUndefined({
    id: randomUUID(),
    kind: "id_verification" as const,
    label: side === "front" ? "ID — front" : "ID — back",
    url: `storage://${uploaded.storagePath}`,
    storagePath: uploaded.storagePath,
    sensitive: true,
    uploadedAt: nowIso,
  }) as CreatorDocument;
}

export async function submitCreatorIdentityVerification(
  appUser: AppUser,
  input: {
    frontFileDataUrl: string;
    frontFileName?: string;
    backFileDataUrl?: string;
    backFileName?: string;
  }
): Promise<{ creator: Creator; verification: CreatorIdentityVerification }> {
  if (!input.frontFileDataUrl?.startsWith("data:")) {
    throw new CreatorError("VALIDATION_FAILED", "Front of ID is required");
  }

  const creator = await getLinkedCreatorForUser(appUser);
  const current = defaultVerification(creator.identityVerification);
  if (current.status === "pending" || current.status === "approved") {
    throw new CreatorError(
      "VALIDATION_FAILED",
      current.status === "approved"
        ? "ID verification is already approved"
        : "ID is already awaiting staff review"
    );
  }

  const front = await uploadSide(
    creator.id,
    "front",
    input.frontFileDataUrl,
    input.frontFileName
  );
  let back: CreatorDocument | undefined;
  if (input.backFileDataUrl?.startsWith("data:")) {
    back = await uploadSide(
      creator.id,
      "back",
      input.backFileDataUrl,
      input.backFileName
    );
  }

  // Remove prior ID verification files from a previous rejected submission.
  const priorIds = new Set(
    [current.frontDocumentId, current.backDocumentId].filter(Boolean) as string[]
  );
  const keptDocs = (creator.documents ?? []).filter((d) => {
    if (!priorIds.has(d.id)) return true;
    if (d.storagePath) void deleteCreatorDocumentFile(d.storagePath);
    return false;
  });

  const submittedAt = new Date().toISOString();
  const verification: CreatorIdentityVerification = stripUndefined({
    status: "pending" as const,
    frontDocumentId: front.id,
    backDocumentId: back?.id,
    submittedAt,
    submittedByUserId: appUser.id,
  }) as CreatorIdentityVerification;

  const documents = [...keptDocs, front, ...(back ? [back] : [])];
  const onboarding = markIdTask(
    creator.onboarding,
    false,
    submittedAt,
    "Awaiting staff review"
  );

  const db = requireDb();
  const ref = db.collection(CREATORS_COLLECTION).doc(creator.id);
  await ref.update(
    stripUndefined({
      identityVerification: verification,
      documents,
      onboarding,
      updatedAt: FieldValue.serverTimestamp(),
    })
  );
  const snap = await ref.get();
  return {
    creator: serializeDoc<Creator>(snap.id, snap.data()!),
    verification,
  };
}

export async function reviewCreatorIdentityVerification(
  appUser: AppUser,
  creatorId: string,
  input: { action: "approve" | "reject"; rejectionReason?: string }
): Promise<Creator> {
  const db = requireDb();
  const ref = db.collection(CREATORS_COLLECTION).doc(creatorId);
  const snap = await ref.get();
  if (!snap.exists) throw new CreatorError("NOT_FOUND", "Creator not found");
  const current = serializeDoc<Creator>(snap.id, snap.data()!);
  if (current.organizationCompany !== appUser.company) {
    throw new CreatorError("NOT_FOUND", "Creator not found");
  }

  const existing = defaultVerification(current.identityVerification);
  if (existing.status !== "pending" && input.action === "approve") {
    throw new CreatorError("VALIDATION_FAILED", "No pending ID submission to approve");
  }
  if (existing.status !== "pending" && input.action === "reject") {
    throw new CreatorError("VALIDATION_FAILED", "No pending ID submission to reject");
  }

  const reviewedAt = new Date().toISOString();
  let verification: CreatorIdentityVerification;
  let onboarding: CreatorOnboardingTask[];

  if (input.action === "approve") {
    verification = stripUndefined({
      ...existing,
      status: "approved" as const,
      reviewedAt,
      reviewedByUserId: appUser.id,
      reviewedByDisplayName: appUser.displayName,
      rejectionReason: undefined,
    }) as CreatorIdentityVerification;
    onboarding = markIdTask(current.onboarding, true, reviewedAt, "Verified by IMG staff");
  } else {
    const reason = input.rejectionReason?.trim();
    if (!reason) {
      throw new CreatorError("VALIDATION_FAILED", "Rejection reason is required");
    }
    verification = stripUndefined({
      ...existing,
      status: "rejected" as const,
      reviewedAt,
      reviewedByUserId: appUser.id,
      reviewedByDisplayName: appUser.displayName,
      rejectionReason: reason,
    }) as CreatorIdentityVerification;
    onboarding = markIdTask(current.onboarding, false, reviewedAt, `Rejected: ${reason}`);
  }

  await ref.update({
    identityVerification: verification,
    onboarding,
    updatedAt: FieldValue.serverTimestamp(),
  });
  const next = await ref.get();
  return serializeDoc<Creator>(next.id, next.data()!);
}

/** Staff: signed URL for an ID side document on this creator. */
export async function getIdentityDocumentViewUrl(
  appUser: AppUser,
  creatorId: string,
  side: "front" | "back"
): Promise<{ url: string; expiresInMs: number }> {
  if (!canViewSensitiveCreatorDocs(appUser)) {
    throw new CreatorError("NOT_AUTHORIZED", "Not authorized to view ID documents");
  }
  const db = requireDb();
  const snap = await db.collection(CREATORS_COLLECTION).doc(creatorId).get();
  if (!snap.exists) throw new CreatorError("NOT_FOUND", "Creator not found");
  const creator = serializeDoc<Creator>(snap.id, snap.data()!);
  if (creator.organizationCompany !== appUser.company) {
    throw new CreatorError("NOT_FOUND", "Creator not found");
  }
  const verification = creator.identityVerification;
  const docId =
    side === "front" ? verification?.frontDocumentId : verification?.backDocumentId;
  if (!docId) throw new CreatorError("NOT_FOUND", `No ${side} ID on file`);
  const doc = (creator.documents ?? []).find((d) => d.id === docId);
  if (!doc?.storagePath) throw new CreatorError("NOT_FOUND", "ID file not available");
  const ttl = 60 * 60 * 1000;
  const url = await getCreatorDocumentSignedUrl(doc.storagePath, ttl);
  return { url, expiresInMs: ttl };
}
