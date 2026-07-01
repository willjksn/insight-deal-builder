import { NextRequest, NextResponse } from "next/server";
import { apiErrorStatus, requireApprovedAuthUser } from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  listManageableProjects,
  listStandaloneScriptsForSharing,
  listTeamUserCandidates,
} from "@/lib/projectAccess/server";
import { canManageProjects, canManageUsers } from "@/lib/utils/permissions";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const projects = await listManageableProjects(db, uid, appUser);
    const canManageTeam =
      canManageUsers(appUser) ||
      canManageProjects(appUser) ||
      projects.some((p) => p.ownerUserId === uid);

    if (!canManageTeam) {
      return NextResponse.json(
        { error: "You do not have permission to manage project teams." },
        { status: 401 }
      );
    }

    const candidates = await listTeamUserCandidates(db, [uid]);
    const standaloneScripts = await listStandaloneScriptsForSharing(db, uid, appUser);

    return NextResponse.json({
      projects: projects.map((p) => ({
        id: p.id,
        projectName: p.projectName,
        clientName: p.clientName,
        ownerUserId: p.ownerUserId ?? null,
      })),
      candidates,
      standaloneScripts,
      canManage: canManageTeam,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load team management";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
