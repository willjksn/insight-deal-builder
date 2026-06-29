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
import { getScriptSessionForUser } from "@/lib/projectAccess/server";
import { resolveSessionBrief, scriptWriterChat } from "@/lib/scriptWriter/scriptWriterAi";
import { ScriptWriterMessage } from "@/lib/scriptWriter/types";

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
    const body = (await request.json()) as { message?: string };

    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const session = await getScriptSessionForUser(db, id, uid, appUser);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (session.status === "applied") {
      return NextResponse.json({ error: "Session already applied to a project" }, { status: 400 });
    }

    const userMessage = newMessage("user", message);
    const messages = [...session.messages, userMessage];
    const brief = resolveSessionBrief(session.brief, session.initialIdea);
    const chat = await scriptWriterChat(brief, messages);
    const assistantContent = chat.questions?.length
      ? `${chat.message}\n\n${chat.questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`
      : chat.message;
    const assistantMessage = newMessage("assistant", assistantContent);
    const nextMessages = [...messages, assistantMessage];

    await db.collection(SCRIPT_WRITER_SESSIONS_COLLECTION).doc(id).update(
      stripUndefined({
        messages: nextMessages,
        updatedAt: FieldValue.serverTimestamp(),
      })
    );

    const updated = await getScriptSessionForUser(db, id, uid, appUser);
    return NextResponse.json({ session: updated, readyToWrite: chat.readyToWrite });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Chat failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
