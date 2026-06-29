import { NextRequest } from "next/server";
import { assertApprovedUser, requireAuthUser } from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { getScoutProjectForUser, loadScoutProject } from "@/lib/projectAccess/server";
import { ScoutProject } from "@/lib/scout/types";

export async function requireScoutProjectAccess(
  request: NextRequest,
  scoutId: string
): Promise<{ uid: string; appUser: Awaited<ReturnType<typeof requireAuthUser>>["appUser"]; project: ScoutProject }> {
  const { uid, appUser } = await requireAuthUser(request);
  assertApprovedUser(appUser);

  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");

  const project = await getScoutProjectForUser(db, scoutId, uid, appUser);
  if (!project) throw new Error("Not authorized");

  return { uid, appUser, project };
}

export async function requireScoutOwner(
  request: NextRequest,
  scoutId: string
): Promise<{ uid: string; appUser: Awaited<ReturnType<typeof requireAuthUser>>["appUser"]; project: ScoutProject }> {
  const { uid, appUser, project } = await requireScoutProjectAccess(request, scoutId);
  if (project.userId !== uid) {
    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");
    const { hasGlobalProjectAdmin } = await import("@/lib/projectAccess/server");
    if (!hasGlobalProjectAdmin(appUser)) {
      throw new Error("Not authorized");
    }
  }
  return { uid, appUser, project };
}

export async function loadScoutOrThrow(scoutId: string): Promise<ScoutProject> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");
  const project = await loadScoutProject(db, scoutId);
  if (!project) throw new Error("Scout session not found");
  return project;
}
