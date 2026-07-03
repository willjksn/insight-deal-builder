import { FieldValue, Firestore } from "firebase-admin/firestore";
import { AppUser } from "@/lib/types";
import { ScriptWriterSession } from "@/lib/scriptWriter/types";
import { SCRIPT_WRITER_SESSIONS_COLLECTION } from "@/lib/scriptWriter/apiClient";
import {
  listProjectMembers,
  listResourceMembers,
  lookupUserById,
  resolveScriptSessionAccess,
} from "@/lib/projectAccess/server";
import { WorkspaceAccessOptions } from "@/lib/projectAccess/workspaceAccess";
import {
  initialsFromLabel,
  normalizeSharedNoteBody,
} from "@/lib/sharedNotes/initials";
import {
  SharedNotesMeta,
  SharedNotesResponse,
  SharedResourceNote,
  SharedResourceType,
} from "@/lib/sharedNotes/types";

export const RESOURCE_NOTES_SUBCOLLECTION = "notes";

function collectionForResourceType(resourceType: SharedResourceType): string {
  if (resourceType !== "script") throw new Error("Resource not found");
  return SCRIPT_WRITER_SESSIONS_COLLECTION;
}

function linkedProjectIdForResource(resource: ScriptWriterSession): string | undefined {
  return resource.linkedProjectId ?? resource.appliedProjectId;
}

function ownerUserIdForResource(resource: ScriptWriterSession): string {
  return resource.userId;
}

function titleForResource(resource: ScriptWriterSession): string {
  return resource.title?.trim() || "Untitled script";
}

function memberHasAreaPermission(member: { permissions: { scripts?: boolean } }): boolean {
  return Boolean(member.permissions.scripts);
}

export async function isResourceSharedWithOthers(
  db: Firestore,
  resourceType: SharedResourceType,
  resourceId: string,
  ownerUserId: string,
  linkedProjectId?: string | null
): Promise<boolean> {
  const collection = collectionForResourceType(resourceType);
  const directMembers = await listResourceMembers(db, collection, resourceId);
  if (directMembers.some((m) => m.userId !== ownerUserId)) return true;

  if (linkedProjectId) {
    const projectMembers = await listProjectMembers(db, linkedProjectId);
    if (
      projectMembers.some(
        (m) => m.userId !== ownerUserId && memberHasAreaPermission(m)
      )
    ) {
      return true;
    }
  }

  return false;
}

async function assertResourceReadAccess(
  db: Firestore,
  resourceType: SharedResourceType,
  resource: ScriptWriterSession,
  uid: string,
  appUser: AppUser,
  options?: WorkspaceAccessOptions,
  adminEmail = ""
): Promise<{ via: "owner" | "project" | "direct" | "admin" | null }> {
  if (resourceType !== "script") throw new Error("Resource not found");
  const { allowed, via } = await resolveScriptSessionAccess(
    db,
    resource,
    uid,
    appUser,
    false,
    options,
    adminEmail
  );
  if (!allowed) throw new Error("Not authorized");
  return { via };
}

export async function listSharedResourceNotes(params: {
  db: Firestore;
  resourceType: SharedResourceType;
  resource: ScriptWriterSession;
  uid: string;
  appUser: AppUser;
  options?: WorkspaceAccessOptions;
  adminEmail?: string;
}): Promise<SharedNotesResponse> {
  const { db, resourceType, resource, uid, appUser, options, adminEmail = "" } = params;
  const access = await assertResourceReadAccess(
    db,
    resourceType,
    resource,
    uid,
    appUser,
    options,
    adminEmail
  );

  const ownerUserId = ownerUserIdForResource(resource);
  const linkedProjectId = linkedProjectIdForResource(resource);
  const isShared = await isResourceSharedWithOthers(
    db,
    resourceType,
    resource.id,
    ownerUserId,
    linkedProjectId
  );

  const canPost = access.via !== "admin" && access.via !== null;

  const snap = await db
    .collection(collectionForResourceType(resourceType))
    .doc(resource.id)
    .collection(RESOURCE_NOTES_SUBCOLLECTION)
    .orderBy("createdAt", "asc")
    .limit(200)
    .get();

  const notes: SharedResourceNote[] = snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      body: data.body as string,
      authorUserId: data.authorUserId as string,
      authorInitials: data.authorInitials as string,
      authorDisplayName: data.authorDisplayName as string | undefined,
      createdAt: data.createdAt as string,
    };
  });

  const meta: SharedNotesMeta = { isShared, canPost, ownerUserId };
  return { notes, meta };
}

export async function createSharedResourceNote(params: {
  db: Firestore;
  resourceType: SharedResourceType;
  resource: ScriptWriterSession;
  uid: string;
  appUser: AppUser;
  body: string;
  options?: WorkspaceAccessOptions;
  adminEmail?: string;
}): Promise<SharedResourceNote> {
  const { db, resourceType, resource, uid, appUser, body, options, adminEmail = "" } = params;
  const access = await assertResourceReadAccess(
    db,
    resourceType,
    resource,
    uid,
    appUser,
    options,
    adminEmail
  );
  if (access.via === "admin") {
    throw new Error("Admin read-only access cannot add notes");
  }

  const normalized = normalizeSharedNoteBody(body);
  if (!normalized) throw new Error("Write a note before posting.");

  const author = await lookupUserById(db, uid);
  const authorInitials = initialsFromLabel(
    author?.displayName ?? appUser.displayName,
    author?.email ?? appUser.email
  );
  const authorDisplayName = author?.displayName?.trim() || appUser.displayName?.trim() || undefined;
  const createdAt = new Date().toISOString();

  const noteData = {
    body: normalized,
    authorUserId: uid,
    authorInitials,
    authorDisplayName,
    createdAt,
    updatedAt: createdAt,
  };

  const ref = await db
    .collection(collectionForResourceType(resourceType))
    .doc(resource.id)
    .collection(RESOURCE_NOTES_SUBCOLLECTION)
    .add(noteData);

  return { id: ref.id, ...noteData };
}

export function resourceUrlForNotification(
  resourceType: SharedResourceType,
  resourceId: string
): string {
  if (resourceType !== "script") return "/dashboard";
  return `/script-writer/${resourceId}`;
}

export function resourceTitleForNotification(
  resourceType: SharedResourceType,
  resource: ScriptWriterSession
): string {
  if (resourceType !== "script") return "Resource";
  return titleForResource(resource);
}

export async function touchResourceUpdatedAt(
  db: Firestore,
  resourceType: SharedResourceType,
  resourceId: string
): Promise<void> {
  await db
    .collection(collectionForResourceType(resourceType))
    .doc(resourceId)
    .set({ updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}
