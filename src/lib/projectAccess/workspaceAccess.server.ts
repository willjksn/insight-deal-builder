import { NextRequest } from "next/server";
import { Firestore, FieldValue } from "firebase-admin/firestore";
import { AppUser } from "@/lib/types";
import { canManageProjects, canManageUsers } from "@/lib/utils/permissions";
import {
  canAdminOpenPrivateWorkspace,
  WorkspaceAccessOptions,
  WorkspaceResourceType,
} from "@/lib/projectAccess/workspaceAccess";

export const ADMIN_ACCESS_LOGS_COLLECTION = "adminAccessLogs";

export function workspaceAccessOptionsFromRequest(request: NextRequest): WorkspaceAccessOptions {
  const adminOpen =
    request.nextUrl.searchParams.get("adminOpen") === "1" ||
    request.headers.get("x-admin-workspace-open") === "true";
  return { adminOpen };
}

export async function lookupOwnerCompany(
  db: Firestore,
  ownerUserId: string
): Promise<string | undefined> {
  const snap = await db.collection("users").doc(ownerUserId).get();
  if (!snap.exists) return undefined;
  return snap.data()?.company as string | undefined;
}

export function isGlobalProjectAdmin(appUser: AppUser): boolean {
  return canManageProjects(appUser) || canManageUsers(appUser);
}

export async function tryAdminWorkspaceReadAccess(
  db: Firestore,
  appUser: AppUser,
  ownerUserId: string,
  options: WorkspaceAccessOptions | undefined,
  context: {
    resourceType: WorkspaceResourceType;
    resourceId: string;
    adminUserId: string;
    adminEmail: string;
  }
): Promise<boolean> {
  if (!options?.adminOpen || !isGlobalProjectAdmin(appUser)) {
    return false;
  }

  const ownerCompany = await lookupOwnerCompany(db, ownerUserId);
  if (!canAdminOpenPrivateWorkspace(ownerCompany)) {
    return false;
  }

  await logAdminWorkspaceAccess(db, {
    adminUserId: context.adminUserId,
    adminEmail: context.adminEmail,
    ownerUserId,
    ownerCompany: ownerCompany ?? "",
    resourceType: context.resourceType,
    resourceId: context.resourceId,
  });

  return true;
}

export async function logAdminWorkspaceAccess(
  db: Firestore,
  entry: {
    adminUserId: string;
    adminEmail: string;
    ownerUserId: string;
    ownerCompany: string;
    resourceType: WorkspaceResourceType;
    resourceId: string;
  }
): Promise<void> {
  await db.collection(ADMIN_ACCESS_LOGS_COLLECTION).add({
    ...entry,
    action: "open",
    createdAt: FieldValue.serverTimestamp(),
  });
}
