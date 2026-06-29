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
import { ScriptWriterBrief, buildInitialUserMessage, inferScriptDetailLevel } from "@/lib/scriptWriter/brief";
import {
  resolveSessionBrief,
  scriptWriterChat,
} from "@/lib/scriptWriter/scriptWriterAi";
import { ScriptWriterMessage } from "@/lib/scriptWriter/types";
import { serializeScriptSession } from "@/lib/scriptWriter/adminApply";

export const runtime = "nodejs";

function newMessage(role: ScriptWriterMessage["role"], content: string): ScriptWriterMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

function sortSessionsByUpdated(
  sessions: ReturnType<typeof serializeScriptSession>[]
) {
  return sessions.sort((a, b) => {
    const aTime =
      typeof a.updatedAt === "object" && a.updatedAt && "toMillis" in a.updatedAt
        ? (a.updatedAt as { toMillis: () => number }).toMillis()
        : 0;
    const bTime =
      typeof b.updatedAt === "object" && b.updatedAt && "toMillis" in b.updatedAt
        ? (b.updatedAt as { toMillis: () => number }).toMillis()
        : 0;
    return bTime - aTime;
  });
}

export async function GET(request: NextRequest) {
  try {
    const { uid, appUser } = await requireAuthUser(request);
    assertCanUseScriptWriter(appUser);
    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    let snap;
    try {
      snap = await db
        .collection(SCRIPT_WRITER_SESSIONS_COLLECTION)
        .where("userId", "==", uid)
        .orderBy("updatedAt", "desc")
        .limit(50)
        .get();
    } catch (indexErr) {
      const msg = indexErr instanceof Error ? indexErr.message : String(indexErr);
      if (!msg.includes("index") && !msg.includes("FAILED_PRECONDITION")) {
        throw indexErr;
      }
      snap = await db
        .collection(SCRIPT_WRITER_SESSIONS_COLLECTION)
        .where("userId", "==", uid)
        .limit(50)
        .get();
    }

    const sessions = sortSessionsByUpdated(
      snap.docs.map((d) => serializeScriptSession(d.id, d.data()))
    );
    return NextResponse.json({ sessions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list sessions";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { uid, appUser } = await requireAuthUser(request);
    assertCanUseScriptWriter(appUser);

    const body = (await request.json()) as {
      initialIdea?: string;
      brief?: ScriptWriterBrief;
      title?: string;
      linkedProjectId?: string;
      linkedScoutProjectId?: string;
      workflowMode?: "text" | "inspiration";
    };

    const workflowMode = body.workflowMode ?? "text";
    const brief = resolveSessionBrief(body.brief, body.initialIdea?.trim() ?? "");
    const hasConcept = Boolean(brief.concept.trim());
    if (!hasConcept && workflowMode !== "inspiration") {
      return NextResponse.json({ error: "Describe your concept first" }, { status: 400 });
    }

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

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
        linkedScoutProjectId: body.linkedScoutProjectId,
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
