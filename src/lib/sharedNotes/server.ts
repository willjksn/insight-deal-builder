import { FieldValue, Firestore } from "firebase-admin/firestore";
import { AppUser } from "@/lib/types";
import { ScriptWriterSession } from "@/lib/scriptWriter/types";
import { ScoutProject } from "@/lib/scout/types";
import { SCRIPT_WRITER_SESSIONS_COLLECTION } from "@/lib/scriptWriter/apiClient";
import { SCOUT_PROJECTS_COLLECTION } from "@/lib/firebase/scoutFirestore";
import {
  listProjectMembers,
  listResourceMembers,
  lookupUserById,
  resolveScoutAccess,
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
  return resourceType === "script" ? SCRIPT_WRITER_SESSIONS_COLLECTION : SCOUT_PROJECTS_COLLECTION;
}

function linkedProjectIdForResource(
  resourceType: SharedResourceType,
  resource: ScriptWriterSession | ScoutProject
): string | undefined {
  if (resourceType === "script") {
    const session = resource as ScriptWriterSession;
    return session.linkedProjectId ?? session.appliedProjectId;
  }
  return (resource as ScoutProject).linkedProjectId ?? undefined;
}

function ownerUserIdForResource(
  resourceType: SharedResourceType,
  resource: ScriptWriterSession | ScoutProject
): string {
  return resource.userId;
}

function titleForResource(
  resourceType: SharedResourceType,
  resource: ScriptWriterSession | ScoutProject
): string {
  if (resourceType === "script") {
    return (resource as ScriptWriterSession).title?.trim() || "Untitled script";
  }
  return (resource as ScoutProject).projectName?.trim() || "Untitled scout";
}

function memberHasAreaPermission(
  resourceType: SharedResourceType,
  member: { permissions: { scripts?: boolean; scout?: boolean } }
): boolean {
  return resourceType === "script" ? Boolean(member.permissions.scripts) : Boolean(member.permissions.scout);
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
        (m) => m.userId !== ownerUserId && memberHasAreaPermission(resourceType, m)
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
  resource: ScriptWriterSession | ScoutProject,
  uid: string,
  appUser: AppUser,
  options?: WorkspaceAccessOptions,
  adminEmail = ""
): Promise<{ via: "owner" | "project" | "direct" | "admin" | null }> {
  if (resourceType === "script") {
    const { allowed, via } = await resolveScriptSessionAccess(
      db,
      resource as ScriptWriterSession,
      uid,
      appUser,
      false,
      options,
      adminEmail
    );
    if (!allowed) throw new Error("Not authorized");
    return { via };
  }

  const { allowed, via } = await resolveScoutAccess(
    db,
    resource as ScoutProject,
    uid,
    appUser,
    options,
    adminEmail
  );
  if (!allowed) throw new Error("Not authorized");
  return { via };
}

export async function listSharedResourceNotes(params: {
  db: Firestore;
  resourceType: SharedResourceType;
  resource: ScriptWriterSession | ScoutProject;
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

  const ownerUserId = ownerUserIdForResource(resourceType, resource);
  const linkedProjectId = linkedProjectIdForResource(resourceType, resource);
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
  resource: ScriptWriterSession | ScoutProject;
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
  return resourceType === "script" ? `/script-writer/${resourceId}` : `/scout/${resourceId}`;
}

export function resourceTitleForNotification(
  resourceType: SharedResourceType,
  resource: ScriptWriterSession | ScoutProject
): string {
  return titleForResource(resourceType, resource);
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
