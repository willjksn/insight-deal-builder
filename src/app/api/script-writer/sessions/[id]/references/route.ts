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
import { researchScriptReferences } from "@/lib/scriptWriter/referenceResearch";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseScriptWriter(appUser);
    const { id } = await params;

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const session = await getScriptSessionForRequest(request, id, uid, appUser);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (!tavilyAvailable()) {
      return NextResponse.json(
        { error: "TAVILY_API_KEY is not configured on the server" },
        { status: 503 }
      );
    }

    const brief = resolveSessionBrief(session.brief, session.initialIdea);
    const referenceResearch = await researchScriptReferences(brief);

    await db.collection(SCRIPT_WRITER_SESSIONS_COLLECTION).doc(id).update(
      stripUndefined({
        referenceResearch,
        updatedAt: FieldValue.serverTimestamp(),
      })
    );

    const updated = await getScriptSessionForRequest(request, id, uid, appUser);
    return NextResponse.json({ referenceResearch, session: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Reference research failed";
    const lower = message.toLowerCase();
    const hint =
      lower.includes("tavily") || lower.includes("budget")
        ? " Check TAVILY_API_KEY / monthly credit cap, or turn off lightweight mode in Admin → Search mode."
        : lower.includes("gemini") || lower.includes("api key")
          ? " Check GEMINI_API_KEY or FIREBASE_SERVICE_ACCOUNT_JSON (Vertex) on the server."
          : "";
    return NextResponse.json({ error: `${message}${hint}` }, { status: apiErrorStatus(message) });
  }
}
