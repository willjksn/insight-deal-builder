import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  apiErrorStatus,
  assertCanUseScriptWriter,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { SCRIPT_WRITER_SESSIONS_COLLECTION } from "@/lib/scriptWriter/apiClient";
import { getScriptSessionForRequest } from "@/lib/projectAccess/requestAccess";
import { inferScriptDetailLevel } from "@/lib/scriptWriter/brief";
import { resolveScriptGenerationOptions } from "@/lib/scriptWriter/generationOptions";
import { resolveShootingKitForSession } from "@/lib/scriptWriter/resolveShootingKit";
import { resolveSessionBrief, scriptWriterGenerate } from "@/lib/scriptWriter/scriptWriterAi";
import { archiveScriptVersion } from "@/lib/scriptWriter/scriptVersions";
import { ScriptDocument } from "@/lib/scriptWriter/types";
import { prepareScriptDocumentForFirestore } from "@/lib/screenplay/serialize";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseScriptWriter(appUser);
    const { id } = await params;

    const body = (await request.json().catch(() => ({}))) as {
      detailedShotList?: boolean;
      storyboardMode?: boolean;
    };

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const session = await getScriptSessionForRequest(request, id, uid, appUser);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const { detailedShotList, storyboardMode } = resolveScriptGenerationOptions(body, session);

    const brief = resolveSessionBrief(session.brief, session.initialIdea);
    const detailLevel = session.detailLevel ?? inferScriptDetailLevel(brief);
    const inspiration =
      session.inspirationAnalysis
        ? {
            analysis: session.inspirationAnalysis,
            images: session.inspirationImages ?? [],
            video: session.inspirationVideo ?? null,
            urls: session.inspirationUrls ?? [],
            confirmNotes: session.inspirationAnalysis.userNotes,
          }
        : undefined;

    const shootingKit = await resolveShootingKitForSession(db, session);

    const script = await scriptWriterGenerate(brief, session.messages, {
      detailLevel,
      inspiration,
      trendsResearch: session.trendsResearch ?? null,
      detailedShotList,
      storyboardMode,
      shootingKit,
    });

    if (session.script) {
      await archiveScriptVersion(db, id, session.script as ScriptDocument, "generate", "Before regenerate");
    }

    await db.collection(SCRIPT_WRITER_SESSIONS_COLLECTION).doc(id).update(
      stripUndefined({
        script: prepareScriptDocumentForFirestore(script),
        title: script.title,
        status: "script_ready",
        refineUsed: false,
        detailedShotList,
        storyboardMode,
        updatedAt: FieldValue.serverTimestamp(),
      })
    );

    const updated = await getScriptSessionForRequest(request, id, uid, appUser);
    return NextResponse.json({ session: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Script generation failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
