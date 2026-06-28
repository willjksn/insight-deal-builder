import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorStatus,
  assertCanUseScriptWriter,
  requireAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { applyScriptToProject, getScriptSessionForUser } from "@/lib/scriptWriter/adminApply";
import { ScriptDocument } from "@/lib/scriptWriter/types";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { uid, appUser } = await requireAuthUser(request);
    assertCanUseScriptWriter(appUser);
    const { id } = await params;
    const body = (await request.json()) as {
      projectId?: string;
      createScout?: boolean;
      updateExistingScout?: boolean;
    };

    const projectId = body.projectId?.trim();
    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const session = await getScriptSessionForUser(db, id, uid);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (!session.script) {
      return NextResponse.json({ error: "Generate the script first" }, { status: 400 });
    }

    const result = await applyScriptToProject({
      db,
      uid,
      session,
      script: session.script as ScriptDocument,
      projectId,
      createScout: body.createScout !== false,
      updateExistingScout: body.updateExistingScout !== false,
    });

    return NextResponse.json({
      ok: true,
      projectId,
      scoutProjectId: result.scoutProjectId,
      productionBoardId: result.productionBoardId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Apply failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
