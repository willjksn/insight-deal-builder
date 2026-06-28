import { NextRequest } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { hasPermission, isInsightOrgUser, resolvePermissions } from "@/lib/utils/permissions";
import { AppUser } from "@/lib/types";

export async function verifyAuthToken(authHeader: string | null): Promise<string> {
  const adminAuth = getAdminAuth();
  if (!adminAuth) throw new Error("Firebase Admin Auth is not configured");

  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("Missing authorization token");

  const decoded = await adminAuth.verifyIdToken(token);
  return decoded.uid;
}

export async function loadAppUser(uid: string): Promise<AppUser> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");
  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) throw new Error("User not found");
  return { id: userSnap.id, ...userSnap.data() } as AppUser;
}

export async function requireAuthUser(request: NextRequest): Promise<{ uid: string; appUser: AppUser }> {
  const uid = await verifyAuthToken(request.headers.get("authorization"));
  const appUser = await loadAppUser(uid);
  return { uid, appUser };
}

export function assertCanViewIdentity(appUser: AppUser): void {
  resolvePermissions(appUser);
  if (!isInsightOrgUser(appUser)) throw new Error("Not authorized");
  if (!hasPermission(appUser, "viewIdentityDocs") && !hasPermission(appUser, "manageUsers")) {
    throw new Error("Not authorized to view ID verification");
  }
}

export function assertCanUseShotScout(appUser: AppUser): void {
  if (!isInsightOrgUser(appUser)) throw new Error("Not authorized");
  if (
    !hasPermission(appUser, "useShotScout") &&
    !hasPermission(appUser, "manageUsers") &&
    !hasPermission(appUser, "manageProjects")
  ) {
    throw new Error("Not authorized for Shot Scout");
  }
}

export function assertCanCreateQuotes(appUser: AppUser): void {
  if (!isInsightOrgUser(appUser)) throw new Error("Not authorized");
  if (!hasPermission(appUser, "createQuotes") && !hasPermission(appUser, "manageUsers")) {
    throw new Error("Not authorized to create quotes");
  }
}

export function assertCanUseScriptWriter(appUser: AppUser): void {
  assertCanUseShotScout(appUser);
}

export function apiErrorStatus(message: string): number {
  if (
    message.includes("token") ||
    message.includes("authorization") ||
    message.includes("Not authorized") ||
    message.includes("User not found")
  ) {
    return 401;
  }
  if (message.includes("not configured")) return 503;
  if (message.includes("not found") || message.includes("No ID verification")) return 404;
  return 500;
}
