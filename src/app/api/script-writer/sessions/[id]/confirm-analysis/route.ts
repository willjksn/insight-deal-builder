import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  apiErrorStatus,
  assertCanUseScriptWriter,
  requireAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { SCRIPT_WRITER_SESSIONS_COLLECTION } from "@/lib/scriptWriter/apiClient";
import { getScriptSessionForUser } from "@/lib/scriptWriter/adminApply";
import { inferScriptDetailLevel } from "@/lib/scriptWriter/brief";
import { resolveSessionBrief, scriptWriterGenerate } from "@/lib/scriptWriter/scriptWriterAi";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { uid, appUser } = await requireAuthUser(request);
    assertCanUseScriptWriter(appUser);
    const { id } = await params;
    const body = (await request.json()) as { notes?: string };

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const session = await getScriptSessionForUser(db, id, uid);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (!session.inspirationAnalysis) {
      return NextResponse.json({ error: "Run inspiration analysis first" }, { status: 400 });
    }

    const brief = resolveSessionBrief(session.brief, session.initialIdea);
    const detailLevel = session.detailLevel ?? inferScriptDetailLevel(brief);
    const confirmNotes = body.notes?.trim();

    const analysis = {
      ...session.inspirationAnalysis,
      userConfirmedAt: new Date().toISOString(),
      userNotes: confirmNotes,
    };

    const script = await scriptWriterGenerate(brief, session.messages, {
      detailLevel,
      inspiration: {
        analysis,
        images: session.inspirationImages ?? [],
        video: session.inspirationVideo ?? null,
        urls: session.inspirationUrls ?? [],
        confirmNotes,
      },
    });

    await db.collection(SCRIPT_WRITER_SESSIONS_COLLECTION).doc(id).update(
      stripUndefined({
        inspirationAnalysis: analysis,
        script,
        title: script.title,
        status: "script_ready",
        updatedAt: FieldValue.serverTimestamp(),
      })
    );

    const updated = await getScriptSessionForUser(db, id, uid);
    return NextResponse.json({ session: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Script generation failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
