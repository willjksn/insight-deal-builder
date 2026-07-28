import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { apiErrorStatus, requireApprovedAuthUser } from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { getScriptSessionForRequest } from "@/lib/projectAccess/requestAccess";
import { SCRIPT_WRITER_SESSIONS_COLLECTION } from "@/lib/scriptWriter/apiClient";
import {
  createScriptSeries,
  getScriptSeries,
  nextSeriesOrder,
} from "@/lib/scriptWriter/series/server";
import { ScriptSeriesEntryKind } from "@/lib/scriptWriter/series/types";
import { ScriptDocument } from "@/lib/scriptWriter/types";
import { canManageUsers } from "@/lib/utils/permissions";

export const runtime = "nodejs";

/** Attach this session to a series (existing or newly created) as an entry. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    const { id } = await params;

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    // Session write access (incl. project-scoped collaborators) enforced here.
    const session = await getScriptSessionForRequest(request, id, uid, appUser);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      seriesId?: string;
      newSeriesTitle?: string;
      entryKind?: ScriptSeriesEntryKind;
    };
    const entryKind: ScriptSeriesEntryKind = body.entryKind ?? "episode";

    let seriesId = body.seriesId?.trim();
    if (!seriesId && body.newSeriesTitle?.trim()) {
      const created = await createScriptSeries(
        uid,
        { title: body.newSeriesTitle.trim() },
        { allowSpicy: canManageUsers(appUser) }
      );
      seriesId = created.id;
    }
    if (!seriesId) {
      return NextResponse.json(
        { error: "Provide a series to add to" },
        { status: 400 }
      );
    }

    // Enforce access to the target series (owner or global admin) — throws otherwise.
    await getScriptSeries(seriesId, uid, appUser);

    const order = await nextSeriesOrder(seriesId);
    const script = session.script as ScriptDocument | null;
    const seriesRecap =
      (script?.logline || script?.productionPack?.premise || "").trim() || undefined;

    await db.collection(SCRIPT_WRITER_SESSIONS_COLLECTION).doc(id).update(
      stripUndefined({
        seriesId,
        seriesEntryKind: entryKind,
        seriesOrder: order,
        seriesRecap,
        updatedAt: FieldValue.serverTimestamp(),
      })
    );

    const updated = await getScriptSessionForRequest(request, id, uid, appUser);
    return NextResponse.json({ session: updated, seriesId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add to series";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

/** Detach this session from its series (keeps the script as a standalone). */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    const { id } = await params;

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const session = await getScriptSessionForRequest(request, id, uid, appUser);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    await db.collection(SCRIPT_WRITER_SESSIONS_COLLECTION).doc(id).update({
      seriesId: FieldValue.delete(),
      seriesEntryKind: FieldValue.delete(),
      seriesOrder: FieldValue.delete(),
      seriesRecap: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const updated = await getScriptSessionForRequest(request, id, uid, appUser);
    return NextResponse.json({ session: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to remove from series";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
