import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  apiErrorStatus,
  assertCanUseScriptWriter,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { tavilyAvailable } from "@/lib/search/tavilyClient";
import { SCRIPT_WRITER_SESSIONS_COLLECTION } from "@/lib/scriptWriter/apiClient";
import { getScriptSessionForRequest } from "@/lib/projectAccess/requestAccess";
import { resolveSessionBrief } from "@/lib/scriptWriter/scriptWriterAi";
import { researchScriptTrends } from "@/lib/scriptWriter/trendsResearch";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseScriptWriter(appUser);
    const { id } = await params;

    const body = (await request.json().catch(() => ({}))) as { forceRefresh?: boolean };
    const forceLive = Boolean(body.forceRefresh);

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const session = await getScriptSessionForRequest(request, id, uid, appUser);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const brief = resolveSessionBrief(session.brief, session.initialIdea);

    if (forceLive && !tavilyAvailable()) {
      return NextResponse.json(
        { error: "TAVILY_API_KEY is not configured on the server" },
        { status: 503 }
      );
    }

    const trendsResearch = await researchScriptTrends(brief, { forceLive, db });

    await db.collection(SCRIPT_WRITER_SESSIONS_COLLECTION).doc(id).update(
      stripUndefined({
        trendsResearch,
        updatedAt: FieldValue.serverTimestamp(),
      })
    );

    const updated = await getScriptSessionForRequest(request, id, uid, appUser);
    return NextResponse.json({ trendsResearch, session: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Trend research failed";
    const lower = message.toLowerCase();
    const hint =
      lower.includes("api key") || lower.includes("gemini")
        ? " Check GEMINI_API_KEY or FIREBASE_SERVICE_ACCOUNT_JSON (Vertex) on the server."
        : lower.includes("tavily")
          ? " Add TAVILY_API_KEY on the server for live trend search."
          : "";
    return NextResponse.json({ error: `${message}${hint}` }, { status: apiErrorStatus(message) });
  }
}
