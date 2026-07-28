import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  apiErrorStatus,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { getScriptSessionForRequest } from "@/lib/projectAccess/requestAccess";
import { hasGlobalProjectAdmin, loadScriptSession } from "@/lib/projectAccess/server";
import { deleteScriptWriterSession } from "@/lib/scriptWriter/deleteSession";
import { SCRIPT_WRITER_SESSIONS_COLLECTION } from "@/lib/scriptWriter/apiClient";
import { inferScriptDetailLevel, ScriptWriterBrief } from "@/lib/scriptWriter/brief";
import { resolveSessionBrief } from "@/lib/scriptWriter/scriptWriterAi";
import { canManageUsers } from "@/lib/utils/permissions";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    const { id } = await params;

    const session = await getScriptSessionForRequest(request, id, uid, appUser);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ session });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load session";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

/** Update the session brief (e.g. change runtime after creation) and re-derive detail level. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    const { id } = await params;

    const body = (await request.json().catch(() => ({}))) as {
      brief?: Partial<ScriptWriterBrief>;
    };
    if (!body.brief || typeof body.brief !== "object") {
      return NextResponse.json({ error: "brief is required" }, { status: 400 });
    }

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    // Access (incl. project-scoped collaborators) is enforced here.
    const session = await getScriptSessionForRequest(request, id, uid, appUser);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Merge the requested changes onto the existing brief, then normalize.
    const mergedBrief = resolveSessionBrief(
      { ...(session.brief ?? {}), ...body.brief } as ScriptWriterBrief,
      session.initialIdea
    );
    // "Spicy" tone is admin-only; never honor it for non-admins even if requested.
    if (mergedBrief.spicyMode && !canManageUsers(appUser)) {
      mergedBrief.spicyMode = false;
    }

    await db.collection(SCRIPT_WRITER_SESSIONS_COLLECTION).doc(id).update(
      stripUndefined({
        brief: mergedBrief,
        detailLevel: inferScriptDetailLevel(mergedBrief),
        updatedAt: FieldValue.serverTimestamp(),
      })
    );

    const updated = await getScriptSessionForRequest(request, id, uid, appUser);
    return NextResponse.json({ session: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update session";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    const { id } = await params;

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const session = await loadScriptSession(db, id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const isOwner = session.userId === uid;
    if (!isOwner && !hasGlobalProjectAdmin(appUser)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    await deleteScriptWriterSession(id, session.userId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
