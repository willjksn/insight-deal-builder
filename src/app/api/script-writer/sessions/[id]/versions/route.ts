import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  apiErrorStatus,
  assertApprovedUser,
  requireAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { getScriptSessionForUser } from "@/lib/projectAccess/server";
import { SCRIPT_WRITER_SESSIONS_COLLECTION } from "@/lib/scriptWriter/apiClient";
import {
  archiveScriptVersion,
  listScriptVersions,
  loadScriptVersion,
} from "@/lib/scriptWriter/scriptVersions";
import { ScriptDocument } from "@/lib/scriptWriter/types";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { uid, appUser } = await requireAuthUser(request);
    assertApprovedUser(appUser);

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const session = await getScriptSessionForUser(db, id, uid, appUser);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const versions = await listScriptVersions(db, id);
    return NextResponse.json({ versions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load versions";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { uid, appUser } = await requireAuthUser(request);
    assertApprovedUser(appUser);

    const body = (await request.json()) as { versionId?: string };
    if (!body.versionId) {
      return NextResponse.json({ error: "versionId is required" }, { status: 400 });
    }

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const session = await getScriptSessionForUser(db, id, uid, appUser);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const script = await loadScriptVersion(db, id, body.versionId);
    if (!script) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    if (session.script) {
      await archiveScriptVersion(db, id, session.script as ScriptDocument, "restore", "Before restore");
    }

    await db.collection(SCRIPT_WRITER_SESSIONS_COLLECTION).doc(id).update(
      stripUndefined({
        script,
        title: script.title,
        status: session.status === "applied" ? "applied" : "script_ready",
        updatedAt: FieldValue.serverTimestamp(),
      })
    );

    const updated = await getScriptSessionForUser(db, id, uid, appUser);
    return NextResponse.json({ session: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to restore version";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
