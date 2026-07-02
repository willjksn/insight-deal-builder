import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorStatus,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { getScriptSessionForRequest } from "@/lib/projectAccess/requestAccess";
import { hasGlobalProjectAdmin, loadScriptSession } from "@/lib/projectAccess/server";
import { deleteScriptWriterSession } from "@/lib/scriptWriter/deleteSession";

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
