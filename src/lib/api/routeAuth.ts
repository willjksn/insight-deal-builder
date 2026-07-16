import { NextRequest } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { bindAiUsageRequest } from "@/lib/ai/usageContext";
import { isUserApproved } from "@/lib/users/approval";
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
  bindAiUsageRequest(request, uid);
  return { uid, appUser };
}

export function assertCanViewIdentity(appUser: AppUser): void {
  resolvePermissions(appUser);
  if (!isInsightOrgUser(appUser)) throw new Error("Not authorized");
  if (!hasPermission(appUser, "viewIdentityDocs") && !hasPermission(appUser, "manageUsers")) {
    throw new Error("Not authorized to view ID verification");
  }
}

export function assertCanUseProductionTools(appUser: AppUser): void {
  if (!isInsightOrgUser(appUser)) throw new Error("Not authorized");
  if (
    !hasPermission(appUser, "useShotScout") &&
    !hasPermission(appUser, "manageUsers") &&
    !hasPermission(appUser, "manageProjects")
  ) {
    throw new Error("Not authorized for production tools");
  }
}

/** @deprecated use assertCanUseProductionTools */
export const assertCanUseShotScout = assertCanUseProductionTools;

export function assertCanCreateQuotes(appUser: AppUser): void {
  if (!isInsightOrgUser(appUser)) throw new Error("Not authorized");
  if (!hasPermission(appUser, "createQuotes") && !hasPermission(appUser, "manageUsers")) {
    throw new Error("Not authorized to create quotes");
  }
}

export function assertCanUseScriptWriter(appUser: AppUser): void {
  assertCanUseProductionTools(appUser);
}

export function assertCanManageProjects(appUser: AppUser): void {
  if (!isInsightOrgUser(appUser)) throw new Error("Not authorized");
  if (!hasPermission(appUser, "manageProjects") && !hasPermission(appUser, "manageUsers")) {
    throw new Error("Not authorized to manage projects");
  }
}

export function assertCanViewRevenueOpportunities(appUser: AppUser): void {
  if (!isInsightOrgUser(appUser)) throw new Error("Not authorized");
  if (
    !hasPermission(appUser, "viewRevenueOpportunities") &&
    !hasPermission(appUser, "manageRevenueOpportunities") &&
    !hasPermission(appUser, "manageUsers")
  ) {
    throw new Error("Not authorized for revenue & opportunities");
  }
}

export function assertCanManageRevenueOpportunities(appUser: AppUser): void {
  if (!isInsightOrgUser(appUser)) throw new Error("Not authorized");
  if (!hasPermission(appUser, "manageRevenueOpportunities") && !hasPermission(appUser, "manageUsers")) {
    throw new Error("Not authorized to manage revenue & opportunities");
  }
}

export function assertApprovedUser(appUser: AppUser): void {
  if (!isUserApproved(appUser)) {
    throw new Error("Not authorized");
  }
}

export async function requireApprovedAuthUser(
  request: NextRequest
): Promise<{ uid: string; appUser: AppUser }> {
  const result = await requireAuthUser(request);
  assertApprovedUser(result.appUser);
  return result;
}

export function getHealthCheckSecret(): string | null {
  const raw = process.env.HEALTH_CHECK_SECRET || process.env.CRON_SECRET;
  return raw?.trim() || null;
}

/** Admin session or shared secret for uptime monitors (CRON_SECRET / HEALTH_CHECK_SECRET). */
export async function requireAdminOrHealthSecret(request: NextRequest): Promise<void> {
  const secret = getHealthCheckSecret();
  if (secret) {
    const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    const headerSecret = bearer || request.headers.get("x-health-secret")?.trim();
    if (headerSecret === secret) return;
  }

  const { appUser } = await requireAuthUser(request);
  assertApprovedUser(appUser);
  if (!hasPermission(appUser, "manageUsers")) {
    throw new Error("Not authorized");
  }
}

export function isResendConfigured(): boolean {
  const raw = process.env.RESEND_API_KEY;
  if (!raw) return false;
  const key = raw.replace(/^Bearer\s+/i, "").replace(/\s+/g, "").trim();
  return key.length > 0;
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
