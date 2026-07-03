import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  apiErrorStatus,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import {
  assertScriptWriterAppAccess,
  hasProjectAreaAccess,
  listAccessibleScriptSessions,
} from "@/lib/projectAccess/server";
import { SCRIPT_WRITER_SESSIONS_COLLECTION } from "@/lib/scriptWriter/apiClient";
import { ScriptWriterBrief, buildInitialUserMessage, inferScriptDetailLevel } from "@/lib/scriptWriter/brief";
import {
  resolveSessionBrief,
  scriptWriterChat,
} from "@/lib/scriptWriter/scriptWriterAi";
import { ScriptWriterMessage } from "@/lib/scriptWriter/types";
import { serializeScriptSession } from "@/lib/scriptWriter/adminApply";
import { canUseProductionTools } from "@/lib/utils/permissions";

export const runtime = "nodejs";

function newMessage(role: ScriptWriterMessage["role"], content: string): ScriptWriterMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    await assertScriptWriterAppAccess(db, uid, appUser);
    const sessions = await listAccessibleScriptSessions(db, uid, appUser);
    return NextResponse.json({
      sessions: sessions.map((s) => serializeScriptSession(s.id, s as unknown as Record<string, unknown>)),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list sessions";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);

    const body = (await request.json()) as {
      initialIdea?: string;
      brief?: ScriptWriterBrief;
      title?: string;
      linkedProjectId?: string;
      workflowMode?: "text" | "inspiration";
      detailedShotList?: boolean;
      storyboardMode?: boolean;
    };

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    if (body.linkedProjectId) {
      const canLink = await hasProjectAreaAccess(
        db,
        body.linkedProjectId,
        uid,
        appUser,
        "scripts"
      );
      if (!canLink && !canUseProductionTools(appUser)) {
        return NextResponse.json({ error: "Not authorized for this project" }, { status: 401 });
      }
    } else {
      await assertScriptWriterAppAccess(db, uid, appUser);
    }

    const workflowMode = body.workflowMode ?? "text";
    const brief = resolveSessionBrief(body.brief, body.initialIdea?.trim() ?? "");
    const hasConcept = Boolean(brief.concept.trim());
    if (!hasConcept && workflowMode !== "inspiration") {
      return NextResponse.json({ error: "Describe your concept first" }, { status: 400 });
    }

    let messages: ScriptWriterMessage[] = [];
    let readyToWrite = false;

    if (workflowMode === "text" && hasConcept) {
      const userMessage = newMessage("user", buildInitialUserMessage(brief));
      const chat = await scriptWriterChat(brief, [userMessage]);
      const assistantContent = chat.questions?.length
        ? `${chat.message}\n\n${chat.questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`
        : chat.message;
      messages = [userMessage, newMessage("assistant", assistantContent)];
      readyToWrite = chat.readyToWrite;
    }

    const title =
      body.title?.trim() ||
      (brief.concept ? brief.concept.slice(0, 60) + (brief.concept.length > 60 ? "…" : "") : "Inspired script");

    const ref = await db.collection(SCRIPT_WRITER_SESSIONS_COLLECTION).add(
      stripUndefined({
        userId: uid,
        title,
        initialIdea: brief.concept,
        brief,
        workflowMode,
        detailLevel: inferScriptDetailLevel(brief),
        status: workflowMode === "inspiration" ? "interviewing" : "interviewing",
        messages,
        script: null,
        inspirationImages: [],
        inspirationVideo: null,
        inspirationAnalysis: null,
        refineUsed: false,
        linkedProjectId: body.linkedProjectId,
        detailedShotList: body.detailedShotList !== false,
        storyboardMode: body.storyboardMode ?? false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    );

    const snap = await ref.get();
    const session = serializeScriptSession(ref.id, snap.data()!);
    return NextResponse.json({ ok: true, id: ref.id, session, readyToWrite });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create session";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
