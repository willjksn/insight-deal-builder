import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { apiErrorStatus, requireApprovedAuthUser } from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { getScriptSessionForRequest } from "@/lib/projectAccess/requestAccess";
import { SCRIPT_WRITER_SESSIONS_COLLECTION } from "@/lib/scriptWriter/apiClient";
import { listSeriesSourceEntries } from "@/lib/scriptWriter/series/server";
import { ScriptTrailerSceneRef } from "@/lib/scriptWriter/series/types";

export const runtime = "nodejs";

/** Available sibling scenes + the current selection for this trailer/teaser. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    const { id } = await params;
    if (!getAdminDb()) throw new Error("Firebase Admin is not configured");

    const session = await getScriptSessionForRequest(request, id, uid, appUser);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (!session.seriesId) {
      return NextResponse.json({ entries: [], selected: [] });
    }

    const entries = await listSeriesSourceEntries(session.seriesId, id);
    return NextResponse.json({ entries, selected: session.trailerSources ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load trailer sources";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

/** Save the selected source scenes for this trailer/teaser. */
export async function POST(
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

    const body = (await request.json().catch(() => ({}))) as {
      sources?: ScriptTrailerSceneRef[];
    };
    const sources: ScriptTrailerSceneRef[] = Array.isArray(body.sources)
      ? body.sources
          .filter(
            (r): r is ScriptTrailerSceneRef =>
              !!r &&
              typeof r.sessionId === "string" &&
              r.sessionId.length > 0 &&
              typeof r.sceneNumber === "string" &&
              r.sceneNumber.length > 0
          )
          .map((r) => ({ sessionId: r.sessionId, sceneNumber: r.sceneNumber }))
          .slice(0, 60)
      : [];

    await db.collection(SCRIPT_WRITER_SESSIONS_COLLECTION).doc(id).update(
      stripUndefined({
        trailerSources: sources,
        updatedAt: FieldValue.serverTimestamp(),
      })
    );

    const updated = await getScriptSessionForRequest(request, id, uid, appUser);
    return NextResponse.json({ session: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save trailer sources";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
