import { Firestore } from "firebase-admin/firestore";
import { AppUser, Project } from "@/lib/types";
import { canManageProjects, canManageUsers, canUseShotScout } from "@/lib/utils/permissions";
import { ScriptWriterSession } from "@/lib/scriptWriter/types";
import { ScoutProject } from "@/lib/scout/types";
import { SCRIPT_WRITER_SESSIONS_COLLECTION } from "@/lib/scriptWriter/apiClient";
import { SCOUT_PROJECTS_COLLECTION } from "@/lib/firebase/scoutFirestore";
import {
  EMPTY_PROJECT_ACCESS,
  FULL_PROJECT_ACCESS,
  ProjectAccessArea,
  ProjectAccessPermissions,
  ProjectMember,
  ResourceMember,
} from "@/lib/projectAccess/types";

export const PROJECT_MEMBERS_SUBCOLLECTION = "members";
export const RESOURCE_MEMBERS_SUBCOLLECTION = "members";

export function hasGlobalProjectAdmin(appUser: AppUser): boolean {
  return canManageProjects(appUser) || canManageUsers(appUser);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function sanitizeProjectPermissions(
  input: Partial<ProjectAccessPermissions> | undefined
): ProjectAccessPermissions {
  return {
    scripts: Boolean(input?.scripts),
    scout: Boolean(input?.scout),
    production: Boolean(input?.production),
    shots: Boolean(input?.shots),
  };
}

export function hasAnyProjectPermission(permissions: ProjectAccessPermissions): boolean {
  return permissions.scripts || permissions.scout || permissions.production || permissions.shots;
}

export interface TeamUserCandidate {
  userId: string;
  email: string;
  displayName?: string;
  approved: boolean;
}

export async function lookupUserById(
  db: Firestore,
  userId: string
): Promise<{ id: string; email: string; displayName?: string; approved?: boolean } | null> {
  const snap = await db.collection("users").doc(userId).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  return {
    id: snap.id,
    email: data.email as string,
    displayName: data.displayName as string | undefined,
    approved: data.approved as boolean | undefined,
  };
}

export async function listTeamUserCandidates(
  db: Firestore,
  excludeUserIds: string[] = []
): Promise<TeamUserCandidate[]> {
  const exclude = new Set(excludeUserIds);
  const snap = await db.collection("users").get();
  return snap.docs
    .map((doc) => {
      const data = doc.data();
      return {
        userId: doc.id,
        email: (data.email as string) ?? "",
        displayName: data.displayName as string | undefined,
        approved: Boolean(data.approved),
      };
    })
    .filter((u) => u.email && !exclude.has(u.userId))
    .sort((a, b) => {
      const aName = (a.displayName || a.email).toLowerCase();
      const bName = (b.displayName || b.email).toLowerCase();
      return aName.localeCompare(bName);
    });
}

export function teamUserLabel(candidate: TeamUserCandidate): string {
  if (candidate.displayName?.trim()) {
    return `${candidate.displayName.trim()} (${candidate.email})`;
  }
  return candidate.email;
}

export async function lookupUserByEmail(
  db: Firestore,
  email: string
): Promise<{ id: string; email: string; displayName?: string; approved?: boolean } | null> {
  const normalized = normalizeEmail(email);
  const snap = await db.collection("users").where("email", "==", normalized).limit(1).get();
  if (snap.empty) {
    const snapOriginal = await db.collection("users").where("email", "==", email.trim()).limit(1).get();
    if (snapOriginal.empty) return null;
    const doc = snapOriginal.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      email: data.email as string,
      displayName: data.displayName as string | undefined,
      approved: data.approved as boolean | undefined,
    };
  }
  const doc = snap.docs[0];
  const data = doc.data();
  return {
    id: doc.id,
    email: data.email as string,
    displayName: data.displayName as string | undefined,
    approved: data.approved as boolean | undefined,
  };
}

export async function getProjectMember(
  db: Firestore,
  projectId: string,
  userId: string
): Promise<ProjectMember | null> {
  const snap = await db
    .collection("projects")
    .doc(projectId)
    .collection(PROJECT_MEMBERS_SUBCOLLECTION)
    .doc(userId)
    .get();
  if (!snap.exists) return null;
  return snap.data() as ProjectMember;
}

export async function listProjectMembers(
  db: Firestore,
  projectId: string
): Promise<ProjectMember[]> {
  const snap = await db
    .collection("projects")
    .doc(projectId)
    .collection(PROJECT_MEMBERS_SUBCOLLECTION)
    .get();
  return snap.docs.map((d) => d.data() as ProjectMember);
}

export async function getResourceMember(
  db: Firestore,
  collectionName: string,
  resourceId: string,
  userId: string
): Promise<ResourceMember | null> {
  const snap = await db
    .collection(collectionName)
    .doc(resourceId)
    .collection(RESOURCE_MEMBERS_SUBCOLLECTION)
    .doc(userId)
    .get();
  if (!snap.exists) return null;
  return snap.data() as ResourceMember;
}

export async function listResourceMembers(
  db: Firestore,
  collectionName: string,
  resourceId: string
): Promise<ResourceMember[]> {
  const snap = await db
    .collection(collectionName)
    .doc(resourceId)
    .collection(RESOURCE_MEMBERS_SUBCOLLECTION)
    .get();
  return snap.docs.map((d) => d.data() as ResourceMember);
}

export async function getProjectIdsForMember(db: Firestore, userId: string): Promise<string[]> {
  const snap = await db.collectionGroup(PROJECT_MEMBERS_SUBCOLLECTION).where("userId", "==", userId).get();
  return snap.docs
    .map((d) => d.ref.parent.parent?.id)
    .filter((id): id is string => Boolean(id));
}

/** Projects where the user can add or edit team members. */
export async function listManageableProjects(
  db: Firestore,
  uid: string,
  appUser: AppUser
): Promise<Project[]> {
  if (hasGlobalProjectAdmin(appUser)) {
    const snap = await db.collection("projects").orderBy("updatedAt", "desc").limit(200).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Project);
  }

  const snap = await db.collection("projects").where("ownerUserId", "==", uid).get();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Project)
    .sort((a, b) => a.projectName.localeCompare(b.projectName));
}

/** Script sessions owned by the user that are not linked to a project (direct share only). */
export async function listStandaloneScriptsForSharing(
  db: Firestore,
  uid: string,
  appUser: AppUser
): Promise<{ id: string; title: string }[]> {
  const ownerId = hasGlobalProjectAdmin(appUser) ? uid : uid;
  const snap = await db
    .collection(SCRIPT_WRITER_SESSIONS_COLLECTION)
    .where("userId", "==", ownerId)
    .orderBy("updatedAt", "desc")
    .limit(100)
    .get();

  return snap.docs
    .filter((d) => {
      const data = d.data();
      return !data.linkedProjectId && !data.appliedProjectId;
    })
    .map((d) => ({
      id: d.id,
      title: (d.data().title as string) || "Untitled script",
    }));
}

export async function resolveProjectPermissions(
  db: Firestore,
  projectId: string,
  uid: string,
  appUser: AppUser
): Promise<ProjectAccessPermissions> {
  if (hasGlobalProjectAdmin(appUser)) return { ...FULL_PROJECT_ACCESS };
  const member = await getProjectMember(db, projectId, uid);
  return member?.permissions ?? { ...EMPTY_PROJECT_ACCESS };
}

export async function hasProjectAreaAccess(
  db: Firestore,
  projectId: string,
  uid: string,
  appUser: AppUser,
  area: ProjectAccessArea
): Promise<boolean> {
  if (hasGlobalProjectAdmin(appUser)) return true;
  const projectSnap = await db.collection("projects").doc(projectId).get();
  if (!projectSnap.exists) return false;
  const project = projectSnap.data() as Project;
  if (project.ownerUserId === uid) return true;
  const member = await getProjectMember(db, projectId, uid);
  return Boolean(member?.permissions[area]);
}

export function canManageProjectTeam(
  appUser: AppUser,
  project: Project,
  uid: string
): boolean {
  if (hasGlobalProjectAdmin(appUser)) return true;
  return project.ownerUserId === uid;
}

export async function assertProjectTeamManagement(
  db: Firestore,
  projectId: string,
  uid: string,
  appUser: AppUser
): Promise<Project> {
  const snap = await db.collection("projects").doc(projectId).get();
  if (!snap.exists) throw new Error("Project not found");
  const project = { id: snap.id, ...snap.data() } as Project;
  if (!canManageProjectTeam(appUser, project, uid)) {
    throw new Error("Not authorized to manage project team");
  }
  return project;
}

function projectIdFromSession(session: ScriptWriterSession): string | undefined {
  return session.linkedProjectId ?? session.appliedProjectId;
}

function projectIdFromScout(project: ScoutProject): string | undefined {
  return project.linkedProjectId;
}

export async function resolveScriptSessionAccess(
  db: Firestore,
  session: ScriptWriterSession,
  uid: string,
  appUser: AppUser,
  requireWrite = false
): Promise<{ allowed: boolean; via: "owner" | "project" | "direct" | "admin" | null }> {
  if (hasGlobalProjectAdmin(appUser)) {
    return { allowed: true, via: "admin" };
  }
  if (session.userId === uid) {
    return { allowed: true, via: "owner" };
  }

  const direct = await getResourceMember(db, SCRIPT_WRITER_SESSIONS_COLLECTION, session.id, uid);
  if (direct?.permissions.scripts) {
    return { allowed: true, via: "direct" };
  }

  const projectId = projectIdFromSession(session);
  if (projectId) {
    const has = await hasProjectAreaAccess(db, projectId, uid, appUser, "scripts");
    if (has) return { allowed: true, via: "project" };
  }

  if (requireWrite) return { allowed: false, via: null };
  return { allowed: false, via: null };
}

export async function assertScriptSessionAccess(
  db: Firestore,
  session: ScriptWriterSession,
  uid: string,
  appUser: AppUser,
  requireWrite = true
): Promise<void> {
  if (!appUser.approved) throw new Error("Not authorized");
  const { allowed } = await resolveScriptSessionAccess(db, session, uid, appUser, requireWrite);
  if (!allowed) throw new Error("Not authorized");
}

export async function resolveScoutAccess(
  db: Firestore,
  project: ScoutProject,
  uid: string,
  appUser: AppUser
): Promise<{ allowed: boolean; via: "owner" | "project" | "direct" | "admin" | null }> {
  if (hasGlobalProjectAdmin(appUser)) {
    return { allowed: true, via: "admin" };
  }
  if (project.userId === uid) {
    return { allowed: true, via: "owner" };
  }

  const direct = await getResourceMember(db, SCOUT_PROJECTS_COLLECTION, project.id, uid);
  if (direct?.permissions.scout) {
    return { allowed: true, via: "direct" };
  }

  const projectId = projectIdFromScout(project);
  if (projectId) {
    const has = await hasProjectAreaAccess(db, projectId, uid, appUser, "scout");
    if (has) return { allowed: true, via: "project" };
  }

  return { allowed: false, via: null };
}

export async function assertScoutAccess(
  db: Firestore,
  project: ScoutProject,
  uid: string,
  appUser: AppUser
): Promise<void> {
  if (!appUser.approved) throw new Error("Not authorized");
  const { allowed } = await resolveScoutAccess(db, project, uid, appUser);
  if (!allowed) throw new Error("Not authorized");
}

export async function loadScriptSession(
  db: Firestore,
  sessionId: string
): Promise<ScriptWriterSession | null> {
  const snap = await db.collection(SCRIPT_WRITER_SESSIONS_COLLECTION).doc(sessionId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as Omit<ScriptWriterSession, "id">) };
}

export async function getScriptSessionForUser(
  db: Firestore,
  sessionId: string,
  uid: string,
  appUser: AppUser
): Promise<ScriptWriterSession | null> {
  const session = await loadScriptSession(db, sessionId);
  if (!session) return null;
  const { allowed } = await resolveScriptSessionAccess(db, session, uid, appUser);
  return allowed ? session : null;
}

export async function loadScoutProject(
  db: Firestore,
  scoutId: string
): Promise<ScoutProject | null> {
  const snap = await db.collection(SCOUT_PROJECTS_COLLECTION).doc(scoutId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as Omit<ScoutProject, "id">) };
}

export async function assertScriptWriterAppAccess(
  db: Firestore,
  uid: string,
  appUser: AppUser
): Promise<void> {
  if (!appUser.approved) throw new Error("Not authorized");
  if (hasGlobalProjectAdmin(appUser)) return;

  if (canUseShotScout(appUser)) return;

  const projectIds = await getProjectIdsForMember(db, uid);
  for (const projectId of projectIds) {
    const perms = await resolveProjectPermissions(db, projectId, uid, appUser);
    if (perms.scripts) return;
  }

  const shareSnap = await db.collectionGroup(RESOURCE_MEMBERS_SUBCOLLECTION).where("userId", "==", uid).get();
  for (const doc of shareSnap.docs) {
    if (doc.ref.parent.parent?.parent?.id === SCRIPT_WRITER_SESSIONS_COLLECTION) return;
  }

  throw new Error("Not authorized");
}

export async function listAccessibleScriptSessions(
  db: Firestore,
  uid: string,
  appUser: AppUser
): Promise<ScriptWriterSession[]> {
  const byId = new Map<string, ScriptWriterSession>();

  const addDoc = (id: string, data: FirebaseFirestore.DocumentData) => {
    byId.set(id, { id, ...(data as Omit<ScriptWriterSession, "id">) });
  };

  let ownedSnap;
  try {
    ownedSnap = await db
      .collection(SCRIPT_WRITER_SESSIONS_COLLECTION)
      .where("userId", "==", uid)
      .orderBy("updatedAt", "desc")
      .limit(50)
      .get();
  } catch {
    ownedSnap = await db
      .collection(SCRIPT_WRITER_SESSIONS_COLLECTION)
      .where("userId", "==", uid)
      .limit(50)
      .get();
  }
  ownedSnap.docs.forEach((d) => addDoc(d.id, d.data()));

  const shareSnap = await db
    .collectionGroup(RESOURCE_MEMBERS_SUBCOLLECTION)
    .where("userId", "==", uid)
    .get();
  for (const doc of shareSnap.docs) {
    if (doc.ref.parent.parent?.parent?.id !== SCRIPT_WRITER_SESSIONS_COLLECTION) continue;
    const sessionId = doc.ref.parent.parent!.id;
    if (byId.has(sessionId)) continue;
    const session = await loadScriptSession(db, sessionId);
    if (session) byId.set(sessionId, session);
  }

  if (!hasGlobalProjectAdmin(appUser)) {
    const projectIds = await getProjectIdsForMember(db, uid);
    for (const projectId of projectIds) {
      const perms = await resolveProjectPermissions(db, projectId, uid, appUser);
      if (!perms.scripts) continue;

      const [linkedSnap, appliedSnap] = await Promise.all([
        db
          .collection(SCRIPT_WRITER_SESSIONS_COLLECTION)
          .where("linkedProjectId", "==", projectId)
          .limit(25)
          .get(),
        db
          .collection(SCRIPT_WRITER_SESSIONS_COLLECTION)
          .where("appliedProjectId", "==", projectId)
          .limit(25)
          .get(),
      ]);
      linkedSnap.docs.forEach((d) => addDoc(d.id, d.data()));
      appliedSnap.docs.forEach((d) => addDoc(d.id, d.data()));
    }
  }

  return [...byId.values()].sort((a, b) => {
    const toMs = (ts: unknown) =>
      typeof ts === "object" && ts && "toMillis" in (ts as object)
        ? (ts as { toMillis: () => number }).toMillis()
        : 0;
    return toMs(b.updatedAt) - toMs(a.updatedAt);
  });
}

export async function listAccessibleScoutProjects(
  db: Firestore,
  uid: string,
  appUser: AppUser
): Promise<ScoutProject[]> {
  const byId = new Map<string, ScoutProject>();

  const addDoc = (id: string, data: FirebaseFirestore.DocumentData) => {
    byId.set(id, { id, ...(data as Omit<ScoutProject, "id">) });
  };

  let ownedSnap;
  try {
    ownedSnap = await db
      .collection(SCOUT_PROJECTS_COLLECTION)
      .where("userId", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();
  } catch {
    ownedSnap = await db
      .collection(SCOUT_PROJECTS_COLLECTION)
      .where("userId", "==", uid)
      .limit(50)
      .get();
  }
  ownedSnap.docs.forEach((d) => addDoc(d.id, d.data()));

  const shareSnap = await db
    .collectionGroup(RESOURCE_MEMBERS_SUBCOLLECTION)
    .where("userId", "==", uid)
    .get();
  for (const doc of shareSnap.docs) {
    if (doc.ref.parent.parent?.parent?.id !== SCOUT_PROJECTS_COLLECTION) continue;
    const scoutId = doc.ref.parent.parent!.id;
    if (byId.has(scoutId)) continue;
    const project = await loadScoutProject(db, scoutId);
    if (project) byId.set(scoutId, project);
  }

  const projectIds = hasGlobalProjectAdmin(appUser)
    ? []
    : await getProjectIdsForMember(db, uid);
  for (const projectId of projectIds) {
    const perms = await resolveProjectPermissions(db, projectId, uid, appUser);
    if (!perms.scout) continue;
    const linkedSnap = await db
      .collection(SCOUT_PROJECTS_COLLECTION)
      .where("linkedProjectId", "==", projectId)
      .limit(25)
      .get();
    linkedSnap.docs.forEach((d) => addDoc(d.id, d.data()));
  }

  return [...byId.values()].sort((a, b) => {
    const toMs = (ts: unknown) =>
      typeof ts === "object" && ts && "seconds" in (ts as object)
        ? (ts as { seconds: number }).seconds * 1000
        : 0;
    return toMs(b.createdAt) - toMs(a.createdAt);
  });
}

export async function getScoutProjectForUser(
  db: Firestore,
  scoutId: string,
  uid: string,
  appUser: AppUser
): Promise<ScoutProject | null> {
  const project = await loadScoutProject(db, scoutId);
  if (!project) return null;
  const { allowed } = await resolveScoutAccess(db, project, uid, appUser);
  return allowed ? project : null;
}

export async function assertScoutAppAccess(
  db: Firestore,
  uid: string,
  appUser: AppUser
): Promise<void> {
  if (!appUser.approved) throw new Error("Not authorized");
  if (hasGlobalProjectAdmin(appUser)) return;

  if (canUseShotScout(appUser)) return;

  const projectIds = await getProjectIdsForMember(db, uid);
  for (const projectId of projectIds) {
    const perms = await resolveProjectPermissions(db, projectId, uid, appUser);
    if (perms.scout) return;
  }

  const shareSnap = await db.collectionGroup(RESOURCE_MEMBERS_SUBCOLLECTION).where("userId", "==", uid).get();
  for (const doc of shareSnap.docs) {
    if (doc.ref.parent.parent?.parent?.id === SCOUT_PROJECTS_COLLECTION) return;
  }

  throw new Error("Not authorized");
}
