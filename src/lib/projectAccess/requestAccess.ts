import { NextRequest } from "next/server";
import { AppUser } from "@/lib/types";
import { getAdminDb } from "@/lib/firebase/admin";
import { ScriptWriterSession } from "@/lib/scriptWriter/types";
import { ScoutProject } from "@/lib/scout/types";
import {
  getScriptSessionForUser,
  getScoutProjectForUser,
  assertScriptSessionAccess,
  loadScriptSession,
  resolveScriptSessionAccess,
  resolveScoutAccess,
  loadScoutProject,
} from "@/lib/projectAccess/server";
import {
  canAdminOpenPrivateWorkspace,
  isPartnerOrgUserByCompany,
  WorkspaceListItem,
  WorkspaceResourceType,
} from "@/lib/projectAccess/workspaceAccess";
import {
  lookupOwnerCompany,
  workspaceAccessOptionsFromRequest,
} from "@/lib/projectAccess/workspaceAccess.server";

export function workspaceAccessFromRequest(request: NextRequest, appUser: AppUser) {
  return {
    options: workspaceAccessOptionsFromRequest(request),
    adminEmail: appUser.email ?? "",
  };
}

export async function getScriptSessionForRequest(
  request: NextRequest,
  sessionId: string,
  uid: string,
  appUser: AppUser
): Promise<ScriptWriterSession | null> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");
  const { options, adminEmail } = workspaceAccessFromRequest(request, appUser);
  return getScriptSessionForUser(db, sessionId, uid, appUser, options, adminEmail);
}

export async function assertScriptSessionForRequest(
  request: NextRequest,
  session: ScriptWriterSession,
  uid: string,
  appUser: AppUser,
  requireWrite = true
): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");
  const { options, adminEmail } = workspaceAccessFromRequest(request, appUser);
  await assertScriptSessionAccess(db, session, uid, appUser, requireWrite, options, adminEmail);
}

export async function listOwnerWorkspaceForAdmin(
  ownerUserId: string,
  adminUid: string,
  appUser: AppUser,
  searchQuery?: string
): Promise<{
  ownerUserId: string;
  ownerCompany?: string;
  partnerPrivateHidden: boolean;
  scripts: WorkspaceListItem[];
  scouts: WorkspaceListItem[];
}> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");

  const ownerCompany = await lookupOwnerCompany(db, ownerUserId);
  const partnerPrivateHidden = isPartnerOrgUserByCompany(ownerCompany);
  const q = searchQuery?.trim().toLowerCase() ?? "";

  const scripts: WorkspaceListItem[] = [];
  const scouts: WorkspaceListItem[] = [];

  let scriptSnap;
  try {
    scriptSnap = await db
      .collection("scriptWriterSessions")
      .where("userId", "==", ownerUserId)
      .orderBy("updatedAt", "desc")
      .limit(50)
      .get();
  } catch {
    scriptSnap = await db
      .collection("scriptWriterSessions")
      .where("userId", "==", ownerUserId)
      .limit(50)
      .get();
  }

  for (const doc of scriptSnap.docs) {
    const data = doc.data();
    const session = { id: doc.id, ...(data as Omit<ScriptWriterSession, "id">) };
    const title = (data.title as string) || "Untitled script";

    if (partnerPrivateHidden) {
      const { allowed } = await resolveScriptSessionAccess(db, session, adminUid, appUser, false);
      if (!allowed) continue;
    }

    if (q && !title.toLowerCase().includes(q)) continue;

    scripts.push({
      id: doc.id,
      title,
      resourceType: "script",
      updatedAt: data.updatedAt,
      linkedProjectId: data.linkedProjectId ?? data.appliedProjectId ?? null,
      status: data.status as string | undefined,
    });
  }

  let scoutSnap;
  try {
    scoutSnap = await db
      .collection("shotScoutProjects")
      .where("userId", "==", ownerUserId)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();
  } catch {
    scoutSnap = await db
      .collection("shotScoutProjects")
      .where("userId", "==", ownerUserId)
      .limit(50)
      .get();
  }

  for (const doc of scoutSnap.docs) {
    const data = doc.data();
    const project = { id: doc.id, ...(data as Omit<ScoutProject, "id">) };
    const title = (data.name as string) || "Untitled scout";

    if (partnerPrivateHidden) {
      const { allowed } = await resolveScoutAccess(db, project, adminUid, appUser);
      if (!allowed) continue;
    }

    if (q && !title.toLowerCase().includes(q)) continue;

    scouts.push({
      id: doc.id,
      title,
      resourceType: "scout",
      updatedAt: data.updatedAt ?? data.createdAt,
      linkedProjectId: (data.linkedProjectId as string | null) ?? null,
      status: data.status as string | undefined,
    });
  }

  return {
    ownerUserId,
    ownerCompany,
    partnerPrivateHidden,
    scripts,
    scouts,
  };
}

export async function openWorkspaceResourceAsAdmin(
  request: NextRequest,
  resourceType: WorkspaceResourceType,
  resourceId: string,
  adminUid: string,
  appUser: AppUser
): Promise<{ url: string; readOnly: boolean }> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");

  if (resourceType === "script") {
    const session = await loadScriptSession(db, resourceId);
    if (!session) throw new Error("Script not found");

    const normal = await resolveScriptSessionAccess(db, session, adminUid, appUser, false);
    if (normal.allowed) {
      const readOnly = normal.via === "admin" || session.userId !== adminUid;
      const suffix = normal.via === "admin" ? "?adminOpen=1" : "";
      return { url: `/script-writer/${resourceId}${suffix}`, readOnly };
    }

    const ownerCompany = await lookupOwnerCompany(db, session.userId);
    if (!canAdminOpenPrivateWorkspace(ownerCompany)) {
      throw new Error(
        "Partner private workspace cannot be opened by admin unless shared or linked to a project"
      );
    }

    const { options, adminEmail } = workspaceAccessFromRequest(request, appUser);
    options.adminOpen = true;
    const opened = await resolveScriptSessionAccess(
      db,
      session,
      adminUid,
      appUser,
      false,
      options,
      adminEmail
    );
    if (!opened.allowed) throw new Error("Not authorized");
    return { url: `/script-writer/${resourceId}?adminOpen=1`, readOnly: true };
  }

  const scout = await loadScoutProject(db, resourceId);
  if (!scout) throw new Error("Scout session not found");

  const normalScout = await resolveScoutAccess(db, scout, adminUid, appUser);
  if (normalScout.allowed) {
    const readOnly = normalScout.via === "admin" || scout.userId !== adminUid;
    const suffix = normalScout.via === "admin" ? "?adminOpen=1" : "";
    return { url: `/scout/${resourceId}${suffix}`, readOnly };
  }

  const ownerCompany = await lookupOwnerCompany(db, scout.userId);
  if (!canAdminOpenPrivateWorkspace(ownerCompany)) {
    throw new Error(
      "Partner private workspace cannot be opened by admin unless shared or linked to a project"
    );
  }

  const { options, adminEmail } = workspaceAccessFromRequest(request, appUser);
  options.adminOpen = true;
  const openedScout = await resolveScoutAccess(db, scout, adminUid, appUser, options, adminEmail);
  if (!openedScout.allowed) throw new Error("Not authorized");
  return { url: `/scout/${resourceId}?adminOpen=1`, readOnly: true };
}
