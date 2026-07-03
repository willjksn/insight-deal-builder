import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorStatus,
  assertCanUseScriptWriter,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { applyScriptToProject } from "@/lib/scriptWriter/adminApply";
import { getScriptSessionForRequest } from "@/lib/projectAccess/requestAccess";
import { hasProjectAreaAccess } from "@/lib/projectAccess/server";
import { ScriptDocument } from "@/lib/scriptWriter/types";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
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

    const session = await getScriptSessionForRequest(request, id, uid, appUser);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (!session.script) {
      return NextResponse.json({ error: "Generate the script first" }, { status: 400 });
    }

    const canApply =
      (await hasProjectAreaAccess(db, projectId, uid, appUser, "production")) ||
      (await hasProjectAreaAccess(db, projectId, uid, appUser, "scripts"));
    if (!canApply) {
      return NextResponse.json({ error: "You do not have access to this project" }, { status: 403 });
    }

    const result = await applyScriptToProject({
      db,
      uid,
      session: { ...session, id: session.id ?? id },
      script: session.script as ScriptDocument,
      projectId,
    });

    return NextResponse.json({
      ok: true,
      projectId,
      productionBoardId: result.productionBoardId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Apply failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
