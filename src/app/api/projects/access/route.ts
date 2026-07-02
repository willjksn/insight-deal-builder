import { NextRequest, NextResponse } from "next/server";
import { apiErrorStatus, requireApprovedAuthUser } from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { getProjectIdsForMember, hasGlobalProjectAdmin } from "@/lib/projectAccess/server";
import { Project } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    if (hasGlobalProjectAdmin(appUser)) {
      let snap;
      try {
        snap = await db.collection("projects").orderBy("updatedAt", "desc").limit(100).get();
      } catch {
        snap = await db.collection("projects").limit(100).get();
      }
      const projects = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Project);
      return NextResponse.json({ projects });
    }

    const projectIds = new Set(await getProjectIdsForMember(db, uid));
    const ownedSnap = await db.collection("projects").where("ownerUserId", "==", uid).get();
    for (const doc of ownedSnap.docs) {
      projectIds.add(doc.id);
    }

    const projects: Project[] = [];
    for (const projectId of projectIds) {
      const snap = await db.collection("projects").doc(projectId).get();
      if (snap.exists) {
        projects.push({ id: snap.id, ...snap.data() } as Project);
      }
    }

    return NextResponse.json({ projects });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list projects";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
