import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorStatus,
  assertCanManageProjects,
  assertCanUseProductionTools,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { createProjectFromIdea } from "@/lib/contentIdeas/createProjectFromIdea";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    assertCanManageProjects(appUser);
    const { id: sessionId } = await params;
    const body = (await request.json()) as { ideaId?: string; projectName?: string };

    const ideaId = body.ideaId?.trim();
    if (!ideaId) return NextResponse.json({ error: "ideaId is required" }, { status: 400 });

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const result = await createProjectFromIdea({
      db,
      uid,
      sessionId,
      ideaId,
      projectName: body.projectName,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create project failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
