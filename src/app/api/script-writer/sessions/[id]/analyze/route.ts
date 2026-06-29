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
import { hasInspirationInput, resolveInspirationUrls } from "@/lib/scriptWriter/inspirationMedia";
import {
  formatAnalysisForDisplay,
  resolveSessionBrief,
  scriptWriterAnalyzeInspiration,
} from "@/lib/scriptWriter/scriptWriterAi";
import {
  ScriptInspirationImage,
  ScriptInspirationUrl,
  ScriptInspirationVideo,
  ScriptWriterMessage,
} from "@/lib/scriptWriter/types";

export const runtime = "nodejs";

function newMessage(role: ScriptWriterMessage["role"], content: string): ScriptWriterMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { uid, appUser } = await requireAuthUser(request);
    assertCanUseScriptWriter(appUser);
    const { id } = await params;
    const body = (await request.json()) as {
      images?: ScriptInspirationImage[];
      video?: ScriptInspirationVideo | null;
      urls?: Pick<ScriptInspirationUrl, "id" | "url" | "tag" | "label" | "referenceMode">[];
    };

    const images = Array.isArray(body.images) ? body.images : [];
    const video = body.video ?? null;
    const urlInput = Array.isArray(body.urls) ? body.urls : [];

    if (!hasInspirationInput({ images, video, urls: urlInput })) {
      return NextResponse.json(
        { error: "Add at least one image, video, or reference URL" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const session = await getScriptSessionForUser(db, id, uid);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const resolvedUrls = urlInput.length ? await resolveInspirationUrls(urlInput) : [];

    const brief = resolveSessionBrief(session.brief, session.initialIdea);
    const analysis = await scriptWriterAnalyzeInspiration({
      brief,
      images,
      video,
      urls: resolvedUrls,
    });
    const assistantMessage = newMessage("assistant", formatAnalysisForDisplay(analysis));

    await db.collection(SCRIPT_WRITER_SESSIONS_COLLECTION).doc(id).update(
      stripUndefined({
        workflowMode: "inspiration",
        inspirationImages: images,
        inspirationVideo: video,
        inspirationUrls: resolvedUrls,
        inspirationAnalysis: analysis,
        status: "analysis_ready",
        title: analysis.suggestedTitle || session.title,
        messages: [assistantMessage],
        updatedAt: FieldValue.serverTimestamp(),
      })
    );

    const updated = await getScriptSessionForUser(db, id, uid);
    return NextResponse.json({ session: updated, analysis });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
