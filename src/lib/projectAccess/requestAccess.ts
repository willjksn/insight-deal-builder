import { NextRequest } from "next/server";
import { AppUser } from "@/lib/types";
import { getAdminDb } from "@/lib/firebase/admin";
import { ScriptWriterSession } from "@/lib/scriptWriter/types";
import {
  getScriptSessionForUser,
  assertScriptSessionAccess,
  loadScriptSession,
  resolveScriptSessionAccess,
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
}> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");

  const ownerCompany = await lookupOwnerCompany(db, ownerUserId);
  const partnerPrivateHidden = isPartnerOrgUserByCompany(ownerCompany);
  const q = searchQuery?.trim().toLowerCase() ?? "";

  const scripts: WorkspaceListItem[] = [];

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

  return {
    ownerUserId,
    ownerCompany,
    partnerPrivateHidden,
    scripts,
  };
}

export async function openWorkspaceResourceAsAdmin(
  request: NextRequest,
  resourceType: WorkspaceResourceType,
  resourceId: string,
  adminUid: string,
  appUser: AppUser
): Promise<{ url: string; readOnly: boolean }> {
  if (resourceType !== "script") {
    throw new Error("Resource not found");
  }

  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");

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
