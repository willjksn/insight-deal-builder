import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  apiErrorStatus,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { getScriptSessionForRequest } from "@/lib/projectAccess/requestAccess";
import { SCRIPT_WRITER_SESSIONS_COLLECTION } from "@/lib/scriptWriter/apiClient";
import { archiveScriptVersion } from "@/lib/scriptWriter/scriptVersions";
import { ScriptDocument } from "@/lib/scriptWriter/types";
import { normalizeScriptDocument } from "@/lib/screenplay/normalize";
import { prepareScriptDocumentForFirestore } from "@/lib/screenplay/serialize";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { uid, appUser } = await requireApprovedAuthUser(request);

    const body = (await request.json()) as { script?: Partial<ScriptDocument> };
    if (!body.script || typeof body.script !== "object") {
      return NextResponse.json({ error: "script is required" }, { status: 400 });
    }

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const session = await getScriptSessionForRequest(request, id, uid, appUser);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (!session.script) {
      return NextResponse.json({ error: "No script to edit yet" }, { status: 400 });
    }

    const current = session.script as ScriptDocument;
    await archiveScriptVersion(db, id, current, "manual", "Before manual edit");

    const nextScript = prepareScriptDocumentForFirestore(
      normalizeScriptDocument({
      ...current,
      ...body.script,
      title: body.script.title?.trim() || current.title,
      logline: body.script.logline ?? current.logline,
      author: body.script.author ?? current.author,
      draftLabel: body.script.draftLabel ?? current.draftLabel,
      fountain: body.script.fountain ?? current.fountain,
      elements: body.script.elements ?? current.elements,
      lookAndFeel: body.script.lookAndFeel ?? current.lookAndFeel,
      references: body.script.references ?? current.references,
      idealRuntime: body.script.idealRuntime ?? current.idealRuntime,
      genre: body.script.genre ?? current.genre,
      scenes: body.script.scenes ?? current.scenes,
      characters: body.script.characters ?? current.characters,
      showPageOneNumber: body.script.showPageOneNumber ?? current.showPageOneNumber,
      productionPack: body.script.productionPack ?? current.productionPack,
      })
    );

    await db.collection(SCRIPT_WRITER_SESSIONS_COLLECTION).doc(id).update(
      stripUndefined({
        script: nextScript,
        title: nextScript.title,
        updatedAt: FieldValue.serverTimestamp(),
      })
    );

    const updated = await getScriptSessionForRequest(request, id, uid, appUser);
    return NextResponse.json({ session: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save script";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
