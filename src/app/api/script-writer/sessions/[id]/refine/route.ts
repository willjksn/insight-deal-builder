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
import { resolveSessionBrief, scriptWriterRefineScript } from "@/lib/scriptWriter/scriptWriterAi";
import { archiveScriptVersion } from "@/lib/scriptWriter/scriptVersions";
import { resolveScriptGenerationOptions } from "@/lib/scriptWriter/generationOptions";
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
    const body = (await request.json()) as {
      message?: string;
      detailedShotList?: boolean;
      storyboardMode?: boolean;
    };

    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json({ error: "Refinement note is required" }, { status: 400 });
    }

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const session = await getScriptSessionForRequest(request, id, uid, appUser);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (session.status !== "script_ready" || !session.script) {
      return NextResponse.json({ error: "Generate a script before refining" }, { status: 400 });
    }
    if (session.refineUsed) {
      return NextResponse.json({ error: "One refinement already used for this session" }, { status: 400 });
    }

    const brief = resolveSessionBrief(session.brief, session.initialIdea);
    const detailLevel = session.detailLevel ?? inferScriptDetailLevel(brief);
    const inspiration =
      session.workflowMode === "inspiration" && session.inspirationAnalysis
        ? {
            analysis: session.inspirationAnalysis,
            images: session.inspirationImages ?? [],
            video: session.inspirationVideo ?? null,
            urls: session.inspirationUrls ?? [],
          }
        : undefined;

    const { detailedShotList, storyboardMode } = resolveScriptGenerationOptions(body, session);

    const script = await scriptWriterRefineScript(
      brief,
      session.script as ScriptDocument,
      message,
      { detailLevel, inspiration, trendsResearch: session.trendsResearch ?? null, detailedShotList, storyboardMode }
    );

    await archiveScriptVersion(db, id, session.script as ScriptDocument, "refine", message.slice(0, 120));

    await db.collection(SCRIPT_WRITER_SESSIONS_COLLECTION).doc(id).update(
      stripUndefined({
        script: prepareScriptDocumentForFirestore(script),
        title: script.title,
        refineUsed: true,
        detailedShotList,
        storyboardMode,
        updatedAt: FieldValue.serverTimestamp(),
      })
    );

    const updated = await getScriptSessionForRequest(request, id, uid, appUser);
    return NextResponse.json({ session: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Refinement failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
